-- Dhikr Tracking Migration Index
-- Run these migrations in order:

-- 1. Create dhikr_list table
\i dhikr_list.sql

-- 2. Enable RLS and create policies
\i rls.sql

-- 3. Create update_at trigger (optional)
\i update_at_trigger.sql

-- 4. Create atomic upsert function with conflict resolution
\i upsert_function.sql
