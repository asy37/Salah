-- Prayer Tracking Migration Index
-- Run these migrations in order:

-- 1. Create prayer_logs table (boolean format)
\i prayer_logs.sql

-- 2. Create sync function
\i sync_prayer_log.sql

-- 3. Create streak function
\i get_prayer_streak.sql

-- 3b. Create streak-for-user (for Edge Functions)
\i get_prayer_streak_for_user.sql

-- 4. Enable RLS
\i rls.sql

-- 5. Create policies
\i policies.sql

-- 6. Create update_at trigger
\i update_at_functions.sql
\i update_at_trigger.sql
