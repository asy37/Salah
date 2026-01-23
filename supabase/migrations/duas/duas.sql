-- Duas Table (Supabase)
-- Stores synced dua records
-- SQLite is the source of truth, this is eventual-consistency backup

create table public.duas (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  text text not null,
  is_favorite boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

-- Index for user queries
create index idx_duas_user_id
on public.duas (user_id);

-- Index for sorting by updated_at
create index idx_duas_updated_at
on public.duas (updated_at desc);
