-- Planazo · Realtime for invitations (new proposals, answers) and my list.
-- Realtime respects RLS: each subscriber only receives rows they can read.

alter publication supabase_realtime add table public.invitations, public.my_plans;
