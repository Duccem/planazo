-- Planazo · Fix: INSERT ... RETURNING on plans failed RLS.
--
-- The SELECT policy called private.can_see_plan(id), which looks the row up in the table; a row
-- being inserted is not visible to that lookup yet, so `insert().select()` was rejected.
-- Check the row's own columns inline and only use a helper for "shared with me".

create or replace function private.plan_shared_with_me(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.my_plans m where m.plan_id = target and m.user_id = (select auth.uid()))
      or exists (select 1 from public.invitations i where i.plan_id = target and i.to_id = (select auth.uid()));
$$;

revoke execute on function private.plan_shared_with_me(uuid) from public, anon;
grant execute on function private.plan_shared_with_me(uuid) to authenticated;

drop policy "plans: read visible" on public.plans;

create policy "plans: read visible" on public.plans
for select to authenticated
using (
  is_public
  or owner_id = (select auth.uid())
  or private.plan_shared_with_me(id)
);
