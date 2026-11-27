-- Planazo · 2/3 · Plans, my list, likes and invitations
--
-- plans        → the plan itself (owned by its creator; public plans form the community feed)
-- my_plans     → a plan in *my* list, with my own date and "done" state
--                (created by me, saved from the community, or accepted from an invitation)
-- plan_likes   → community likes; plans.likes_count is kept in sync by a trigger
-- invitations  → "te propongo este plan": who sent it to whom and what they answered

create type public.plan_category as enum ('comida', 'aventura', 'cultura', 'casa', 'escapada', 'deporte');
create type public.plan_cover as enum ('sunset', 'sea', 'clay', 'dusk', 'snow', 'forest', 'night', 'candy');
create type public.invitation_response as enum ('pendiente', 'si', 'quizas', 'no');

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  category public.plan_category not null,
  cover public.plan_cover not null default 'sunset',
  price smallint not null default 0 check (price between 0 and 3), -- gratis, $, $$, $$$
  duration_label text check (char_length(duration_label) <= 40),
  place text check (char_length(place) <= 120),
  is_public boolean not null default false,
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index plans_owner_id_idx on public.plans (owner_id);
create index plans_public_feed_idx on public.plans (created_at desc) where is_public;

create trigger plans_touch before update on public.plans
for each row execute function private.touch_updated_at();

-- likes_count is maintained by the server only.
revoke update on public.plans from authenticated, anon;
grant update (title, description, category, cover, price, duration_label, place, is_public)
  on public.plans to authenticated;

create table public.my_plans (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete cascade,
  scheduled_at timestamptz, -- null = "algún día"
  done boolean not null default false,
  added_at timestamptz not null default now(),
  primary key (user_id, plan_id)
);
create index my_plans_plan_id_idx on public.my_plans (plan_id);

create table public.plan_likes (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, plan_id)
);
create index plan_likes_plan_id_idx on public.plan_likes (plan_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  from_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  note text check (char_length(note) <= 500),
  response public.invitation_response not null default 'pendiente',
  sent_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (plan_id, to_id),
  check (from_id <> to_id)
);
create index invitations_to_id_idx on public.invitations (to_id, sent_at desc);
create index invitations_from_id_idx on public.invitations (from_id);

-- Responses go through respond_to_invitation(); nobody updates rows directly.
revoke update on public.invitations from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- New plans go straight into the creator's list.
create or replace function private.add_own_plan_to_list()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.my_plans (user_id, plan_id) values (new.owner_id, new.id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger plans_add_to_owner_list after insert on public.plans
for each row execute function private.add_own_plan_to_list();

create or replace function private.sync_likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.plans set likes_count = likes_count + 1 where id = new.plan_id;
  else
    update public.plans set likes_count = greatest(likes_count - 1, 0) where id = old.plan_id;
  end if;
  return null;
end;
$$;

create trigger plan_likes_count after insert or delete on public.plan_likes
for each row execute function private.sync_likes_count();

-- ---------------------------------------------------------------------------
-- Helpers for RLS (bypass RLS internally to avoid policy recursion)
-- ---------------------------------------------------------------------------

create or replace function private.can_see_plan(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.plans p
    where p.id = target
      and (
        p.is_public
        or p.owner_id = (select auth.uid())
        or exists (select 1 from public.my_plans m where m.plan_id = p.id and m.user_id = (select auth.uid()))
        or exists (select 1 from public.invitations i where i.plan_id = p.id and i.to_id = (select auth.uid()))
      )
  );
$$;

create or replace function private.authors_public_plan(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.plans p where p.owner_id = target and p.is_public);
$$;

revoke execute on function private.can_see_plan(uuid), private.authors_public_plan(uuid) from public, anon;
grant execute on function private.can_see_plan(uuid), private.authors_public_plan(uuid) to authenticated;
revoke execute on function private.add_own_plan_to_list(), private.sync_likes_count() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: answer an invitation. "si"/"quizas" add the plan to my list, "no" removes it.
-- ---------------------------------------------------------------------------

create or replace function public.respond_to_invitation(invitation uuid, answer public.invitation_response)
returns public.invitations
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invitations;
begin
  update public.invitations i
  set response = answer, responded_at = case when answer = 'pendiente' then null else now() end
  where i.id = invitation and i.to_id = (select auth.uid())
  returning * into inv;

  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;

  if answer in ('si', 'quizas') then
    insert into public.my_plans (user_id, plan_id) values (inv.to_id, inv.plan_id) on conflict do nothing;
  elsif answer = 'no' then
    delete from public.my_plans m
    where m.user_id = inv.to_id and m.plan_id = inv.plan_id
      and not exists (select 1 from public.plans p where p.id = inv.plan_id and p.owner_id = inv.to_id);
  end if;

  return inv;
end;
$$;

revoke execute on function public.respond_to_invitation(uuid, public.invitation_response) from public, anon;
grant execute on function public.respond_to_invitation(uuid, public.invitation_response) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.plans enable row level security;
alter table public.my_plans enable row level security;
alter table public.plan_likes enable row level security;
alter table public.invitations enable row level security;

-- plans
create policy "plans: read visible" on public.plans
for select to authenticated
using (private.can_see_plan(id));

create policy "plans: create own" on public.plans
for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy "plans: update own" on public.plans
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "plans: delete own" on public.plans
for delete to authenticated
using (owner_id = (select auth.uid()));

-- my_plans: only my rows, and only for plans I can see
create policy "my_plans: read own" on public.my_plans
for select to authenticated
using (user_id = (select auth.uid()));

create policy "my_plans: add visible plan" on public.my_plans
for insert to authenticated
with check (user_id = (select auth.uid()) and private.can_see_plan(plan_id));

create policy "my_plans: update own" on public.my_plans
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "my_plans: remove own" on public.my_plans
for delete to authenticated
using (user_id = (select auth.uid()));

-- plan_likes: like public plans only
create policy "plan_likes: read own" on public.plan_likes
for select to authenticated
using (user_id = (select auth.uid()));

create policy "plan_likes: like public plan" on public.plan_likes
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.plans p where p.id = plan_likes.plan_id and p.is_public)
);

create policy "plan_likes: unlike" on public.plan_likes
for delete to authenticated
using (user_id = (select auth.uid()));

-- invitations: sender and recipient can read; send only plans in my list to people I'm connected with
create policy "invitations: read sent and received" on public.invitations
for select to authenticated
using (from_id = (select auth.uid()) or to_id = (select auth.uid()));

create policy "invitations: send to connection" on public.invitations
for insert to authenticated
with check (
  from_id = (select auth.uid())
  and private.is_connected(to_id)
  and exists (
    select 1 from public.my_plans m
    where m.user_id = (select auth.uid()) and m.plan_id = invitations.plan_id
  )
);

create policy "invitations: cancel sent" on public.invitations
for delete to authenticated
using (from_id = (select auth.uid()));

-- profiles: also readable when they author a public plan (community feed)
create policy "profiles: read community authors" on public.profiles
for select to authenticated
using (private.authors_public_plan(id));
