-- Dhikr List Table (Supabase)
-- Stores synced dhikr tracking records
-- SQLite is the source of truth, this is eventual-consistency backup

create table public.dhikr_list (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  label text not null,
  target_count integer not null,
  current_count integer not null,
  status text not null check (status in ('active','completed')),
  started_at bigint not null,
  completed_at bigint,
  updated_at bigint not null,
  created_at timestamptz not null default now()
);

-- Unique constraint: one dhikr per user per slug
create unique index idx_dhikr_user_slug
on public.dhikr_list (user_id, slug);
