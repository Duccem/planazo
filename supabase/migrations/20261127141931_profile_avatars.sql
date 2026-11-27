-- Planazo · Profile pictures (Supabase Storage).
--
-- Files live in the public bucket `avatars` at `{user_id}/{random uuid}.jpg`. A new upload gets a
-- new file name, so the public URL changes with every change of picture (no stale caches).
-- `profiles.avatar_path` points at the current one; null means "initial on the profile colour".
-- Anyone with the URL can see the picture (like on most apps); only its owner can write.

-- ---------------------------------------------------------------------------
-- Bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- profiles.avatar_path
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column avatar_path text check (avatar_path is null or split_part(avatar_path, '/', 1) = id::text);
comment on column public.profiles.avatar_path is 'Path in the avatars bucket: {user_id}/{file}. Null = no picture.';

grant update (avatar_path) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Storage policies (bucket avatars). Reads go through the public URL; the select policy only
-- lets owners list/remove their own files (and keeps the bucket from being listed by others).
-- ---------------------------------------------------------------------------

create policy "avatars: owner reads" on storage.objects
for select to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner uploads" on storage.objects
for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner deletes" on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
