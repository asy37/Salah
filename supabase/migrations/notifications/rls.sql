alter table public.user_settings enable row level security;
alter table public.push_tokens enable row level security;

create policy "Users can manage own user_settings"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own push_tokens"
  on public.push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
