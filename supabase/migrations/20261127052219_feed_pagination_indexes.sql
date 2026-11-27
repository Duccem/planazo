-- Planazo · Indexes for the paginated community feed (keyset on created_at, id).
-- Feed query: is_public, optionally by category, ordered by created_at desc, id desc.

drop index if exists public.plans_public_feed_idx;

create index plans_public_feed_idx on public.plans (created_at desc, id desc) where is_public;
create index plans_public_feed_category_idx on public.plans (category, created_at desc, id desc) where is_public;
