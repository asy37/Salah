-- Supabase Storage: avatars bucket + RLS policies
-- Bucket is private; users can access only their own folder: <uid>/...

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- NOTE (Supabase Cloud):
-- `storage.objects` is owned/managed by Supabase, so running
-- `alter table storage.objects enable row level security;`
-- can fail with: "must be owner of table objects".
-- RLS is already enabled for Storage tables in Supabase, so we only add policies here.

-- Helper: first path segment must be auth.uid()
-- storage.foldername(name) returns text[] of folder segments

create policy "Users can read own avatars"
  on storage.objects
  for select
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload own avatars"
  on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own avatars"
  on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own avatars"
  on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

