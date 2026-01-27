-- Auth + profile bootstrap
-- Run this file to apply auth-related schema in correct order.

\i users_profile.sql
\i update_at_function.sql
\i update_at_trigger.sql
\i users_profile_rls.sql
\i auto_user_function.sql
\i auto_user_trigger.sql
\i storage_avatars.sql

create index if not exists users_profile_id_idx
on public.users_profile(id);