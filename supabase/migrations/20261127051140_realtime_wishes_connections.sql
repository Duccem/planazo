-- Planazo · Realtime for the couple's shared list and for new connections.
-- Realtime respects RLS: each subscriber only receives rows they can read.

alter publication supabase_realtime add table public.wishes, public.connections;
