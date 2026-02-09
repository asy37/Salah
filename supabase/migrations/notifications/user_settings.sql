-- user_settings: stores user notification preferences for server-side push
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prayer_method text default '13',
  notification_settings jsonb default '{}',
  location jsonb,
  daily_verse_enabled boolean default true,
  daily_verse_time text default '09:00',
  streak_enabled boolean default true,
  streak_time text default '08:00',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

create index if not exists idx_user_settings_user_id on public.user_settings(user_id);
