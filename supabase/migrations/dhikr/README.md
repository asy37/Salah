# Dhikr Sync Migration

## Overview

This migration creates the Supabase table and policies for dhikr tracking sync.

## Files

1. **dhikr_list.sql** - Creates the `dhikr_list` table
2. **rls.sql** - Enables RLS and creates security policies
3. **update_at_trigger.sql** - Optional trigger for updated_at (we use bigint, so this is optional)
4. **index.sql** - Migration index file

## Running Migrations

### Local Development

```bash
cd supabase
supabase db reset
```

### Production (Supabase Dashboard)

1. Go to SQL Editor
2. Run each file in order:
   - `dhikr_list.sql`
   - `rls.sql`
   - `update_at_trigger.sql` (optional)

## Table Schema

```sql
CREATE TABLE dhikr_list (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  target_count INTEGER NOT NULL,
  current_count INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','completed')),
  started_at BIGINT NOT NULL,        -- milliseconds
  completed_at BIGINT,                -- milliseconds | null
  updated_at BIGINT NOT NULL,         -- milliseconds
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_dhikr_user_slug ON dhikr_list (user_id, slug);
```

## Security

- RLS enabled
- Users can only read/insert/update their own records
- No DELETE policy (clients never delete from Supabase)
