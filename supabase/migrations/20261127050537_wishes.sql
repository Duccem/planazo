-- Planazo · 3/3 · Wishes, shared between the couple
--
-- The app's owner ("ambos" | "yo" | "pareja") is relative to the viewer, so the table stores
-- who it is for: for_id = null means both, otherwise the profile it is for.
-- A wish is visible to whoever added it and to their current partner.

create type public.wish_kind as enum ('regalo', 'actividad', 'meta');

create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  added_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  for_id uuid references public.profiles (id) on delete cascade,
  kind public.wish_kind not null,
  title text not null check (char_length(title) between 1 and 120),
  note text check (char_length(note) <= 500),
  done boolean not null default false,
  progress numeric(3, 2) check (progress between 0 and 1), -- only for kind = 'meta'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind = 'meta' or progress is null)
);
create index wishes_added_by_idx on public.wishes (added_by, created_at desc);
create index wishes_for_id_idx on public.wishes (for_id);

create trigger wishes_touch before update on public.wishes
for each row execute function private.touch_updated_at();

revoke update on public.wishes from authenticated, anon;
grant update (for_id, title, note, done, progress) on public.wishes to authenticated;

create or replace function private.can_see_wish(author uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select author = (select auth.uid()) or author = private.partner_of((select auth.uid()));
$$;

revoke execute on function private.can_see_wish(uuid) from public, anon;
grant execute on function private.can_see_wish(uuid) to authenticated;

alter table public.wishes enable row level security;

create policy "wishes: read mine and partner's" on public.wishes
for select to authenticated
using (private.can_see_wish(added_by));

-- for_id must be me, my partner, or null (both).
create policy "wishes: add" on public.wishes
for insert to authenticated
with check (
  added_by = (select auth.uid())
  and (for_id is null or for_id = (select auth.uid()) or for_id = private.partner_of((select auth.uid())))
);

-- Either of the couple can tick off or edit a shared wish.
create policy "wishes: update shared" on public.wishes
for update to authenticated
using (private.can_see_wish(added_by))
with check (
  private.can_see_wish(added_by)
  and (for_id is null or for_id = (select auth.uid()) or for_id = private.partner_of((select auth.uid())))
);

create policy "wishes: delete shared" on public.wishes
for delete to authenticated
using (private.can_see_wish(added_by));
