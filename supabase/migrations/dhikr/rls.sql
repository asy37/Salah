-- Row Level Security for dhikr_list

alter table public.dhikr_list enable row level security;

-- Policy: Users can read only their own dhikr records
create policy "Users can view own dhikr_list"
  on public.dhikr_list
  for select
  using (auth.uid() = user_id);

-- Policy: Users can insert their own dhikr records
create policy "Users can insert own dhikr_list"
  on public.dhikr_list
  for insert
  with check (auth.uid() = user_id);

-- Policy: Users can update their own dhikr records
create policy "Users can update own dhikr_list"
  on public.dhikr_list
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No DELETE policy - clients should never delete from Supabase
