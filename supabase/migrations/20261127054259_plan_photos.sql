-- Planazo · Photos for plans (Supabase Storage).
--
-- Files live in the private bucket `plan-photos` at `{plan_id}/{photo_id}.jpg`; the app shows them
-- with short-lived signed URLs. Rows in `plan_photos` give the order: the first one is the cover.
-- Whoever can see a plan can see its photos; only the plan's owner can add, reorder or remove them.

-- ---------------------------------------------------------------------------
-- Bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('plan-photos', 'plan-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function private.owns_plan(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.plans p where p.id = target and p.owner_id = (select auth.uid()));
$$;

-- "{plan_id}/{file}" → plan_id, or null when the path isn't shaped like that.
create or replace function private.plan_id_from_path(path text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return split_part(path, '/', 1)::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

revoke execute on function private.owns_plan(uuid), private.plan_id_from_path(text) from public, anon;
grant execute on function private.owns_plan(uuid), private.plan_id_from_path(text) to authenticated;

-- ---------------------------------------------------------------------------
-- plan_photos
-- ---------------------------------------------------------------------------

create table public.plan_photos (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  path text not null unique,
  position integer not null default 0,
  width integer check (width > 0),
  height integer check (height > 0),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (private.plan_id_from_path(path) = plan_id)
);
comment on table public.plan_photos is 'Photos of a plan, ordered by position; the first one is the cover.';

create index plan_photos_plan_id_idx on public.plan_photos (plan_id, position);
create index plan_photos_created_by_idx on public.plan_photos (created_by);

-- Up to 10 photos per plan.
create or replace function private.limit_plan_photos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.plan_photos p where p.plan_id = new.plan_id) >= 10 then
    raise exception 'too_many_photos' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function private.limit_plan_photos() from public, anon, authenticated;

create trigger plan_photos_limit before insert on public.plan_photos
for each row execute function private.limit_plan_photos();

-- Only the order can change after upload.
revoke update on public.plan_photos from authenticated, anon;
grant update (position) on public.plan_photos to authenticated;

alter table public.plan_photos enable row level security;

create policy "plan_photos: read with plan" on public.plan_photos
for select to authenticated
using (private.can_see_plan(plan_id));

create policy "plan_photos: owner adds" on public.plan_photos
for insert to authenticated
with check (created_by = (select auth.uid()) and private.owns_plan(plan_id));

create policy "plan_photos: owner reorders" on public.plan_photos
for update to authenticated
using (private.owns_plan(plan_id))
with check (private.owns_plan(plan_id));

create policy "plan_photos: owner removes" on public.plan_photos
for delete to authenticated
using (private.owns_plan(plan_id));

-- ---------------------------------------------------------------------------
-- Storage policies (bucket plan-photos)
-- ---------------------------------------------------------------------------

create policy "plan-photos: read with plan" on storage.objects
for select to authenticated
using (bucket_id = 'plan-photos' and private.can_see_plan(private.plan_id_from_path(name)));

create policy "plan-photos: owner uploads" on storage.objects
for insert to authenticated
with check (bucket_id = 'plan-photos' and private.owns_plan(private.plan_id_from_path(name)));

create policy "plan-photos: owner deletes" on storage.objects
for delete to authenticated
using (bucket_id = 'plan-photos' and private.owns_plan(private.plan_id_from_path(name)));
