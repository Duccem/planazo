-- Planazo · 1/3 · Profiles and connections (couple + friends)
--
-- Helpers that RLS policies call live in the `private` schema, which the Data API does not expose.
-- They are SECURITY DEFINER so policies can look across tables without recursive RLS checks.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Profiles: one per auth user, created automatically on sign-up.
-- ---------------------------------------------------------------------------

create or replace function private.new_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O, 1/I
  code text;
begin
  loop
    code := 'PLZ-';
    for i in 1..4 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles p where p.invite_code = code);
  end loop;
  return code;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  color text not null default '#FF6B4A' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  invite_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Public identity of a user: name, avatar colour and invite code.';

-- Default needs the table to exist (the function checks for duplicates).
alter table public.profiles alter column invite_code set default private.new_invite_code();

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
for each row execute function private.touch_updated_at();

-- The invite code and id are not user editable.
revoke update on public.profiles from authenticated, anon;
grant update (name, color) on public.profiles to authenticated;

-- Create the profile when someone signs up (name comes from signUp options.data.name).
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  palette constant text[] := array['#FF6B4A', '#FFC23D', '#3F2FD6', '#3E9B6A', '#17123D'];
begin
  insert into public.profiles (id, name, color)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), 'Planazo'), 60),
    palette[1 + floor(random() * array_length(palette, 1))::int]
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

-- Backfill users that signed up before this migration.
insert into public.profiles (id, name)
select u.id, left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'name'), ''), split_part(u.email, '@', 1), 'Planazo'), 60)
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Connections: directed rows, one per side (A→B and B→A), so each user only reads their own.
-- A user has at most one partner ("pareja"). Created and removed only through RPCs below.
-- ---------------------------------------------------------------------------

create type public.relation as enum ('pareja', 'amigo');

create table public.connections (
  user_id uuid not null references public.profiles (id) on delete cascade,
  other_id uuid not null references public.profiles (id) on delete cascade,
  relation public.relation not null,
  created_at timestamptz not null default now(),
  primary key (user_id, other_id),
  check (user_id <> other_id)
);
comment on table public.connections is 'Who I plan with. Always stored in both directions.';

create unique index connections_one_partner on public.connections (user_id) where relation = 'pareja';
create index connections_other_id_idx on public.connections (other_id);

create or replace function private.is_connected(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.connections c
    where c.user_id = (select auth.uid()) and c.other_id = target
  );
$$;

create or replace function private.partner_of(uid uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.other_id from public.connections c where c.user_id = uid and c.relation = 'pareja';
$$;

-- RPC: join someone using their invite code.
create or replace function public.redeem_invite_code(code text, as_relation public.relation default 'amigo')
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  them public.profiles;
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into them from public.profiles p where p.invite_code = upper(trim(code));
  if not found then
    raise exception 'invite_code_not_found' using errcode = 'P0002';
  end if;
  if them.id = me then
    raise exception 'invite_code_is_yours' using errcode = '22023';
  end if;
  if as_relation = 'pareja' and (private.partner_of(me) is not null or private.partner_of(them.id) is not null) then
    raise exception 'already_has_partner' using errcode = '23505';
  end if;

  insert into public.connections (user_id, other_id, relation)
  values (me, them.id, as_relation), (them.id, me, as_relation)
  on conflict (user_id, other_id) do update set relation = excluded.relation;

  return them;
end;
$$;

-- RPC: remove a connection on both sides.
create or replace function public.remove_connection(other uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.connections c
  where (c.user_id = (select auth.uid()) and c.other_id = other)
     or (c.user_id = other and c.other_id = (select auth.uid()));
$$;

revoke execute on function public.redeem_invite_code(text, public.relation) from public, anon;
revoke execute on function public.remove_connection(uuid) from public, anon;
grant execute on function public.redeem_invite_code(text, public.relation) to authenticated;
grant execute on function public.remove_connection(uuid) to authenticated;
revoke execute on all functions in schema private from public, anon;
grant execute on function private.is_connected(uuid), private.partner_of(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.connections enable row level security;

-- Own profile and people I'm connected with. (Community authors are added in migration 2.)
create policy "profiles: read own and connections" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or private.is_connected(id));

create policy "profiles: update own" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "connections: read own" on public.connections
for select to authenticated
using (user_id = (select auth.uid()));
