-- Planazo · plan_photos.position holds millisecond timestamps (new photos go last, a negative one
-- moves a photo to the front as cover), which don't fit in a 32-bit integer.

alter table public.plan_photos alter column position type bigint;
