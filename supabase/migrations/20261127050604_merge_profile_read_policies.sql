-- Planazo · One SELECT policy on profiles instead of two (advisor: multiple_permissive_policies).

drop policy "profiles: read own and connections" on public.profiles;
drop policy "profiles: read community authors" on public.profiles;

-- Own profile, people I'm connected with, and authors of public plans (community feed).
create policy "profiles: read visible" on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or private.is_connected(id)
  or private.authors_public_plan(id)
);
