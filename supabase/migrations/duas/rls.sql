-- Row Level Security for duas

alter table public.duas enable row level security;

-- Policy: Users can read only their own duas
create policy "Users can view own duas"
  on public.duas
  for select
  using (auth.uid() = user_id);

-- Policy: Users can insert their own duas
create policy "Users can insert own duas"
  on public.duas
  for insert
  with check (auth.uid() = user_id);

-- Policy: Users can update their own duas
create policy "Users can update own duas"
  on public.duas
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: Users can delete their own duas
create policy "Users can delete own duas"
  on public.duas
  for delete
  using (auth.uid() = user_id);
