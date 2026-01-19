-- SQLite Schema for Offline-First Prayer Tracking
-- This is the source of truth for daily prayer state

-- 1️⃣ Daily Prayer State Table (SINGLE ROW ONLY)
-- Stores ONLY the current day's prayer state
-- Reset daily after imsak time

CREATE TABLE IF NOT EXISTS daily_prayer_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  date TEXT NOT NULL, -- YYYY-MM-DD format
  fajr TEXT NOT NULL DEFAULT 'upcoming', -- 'prayed' | 'unprayed' | 'later' | 'upcoming'
  dhuhr TEXT NOT NULL DEFAULT 'upcoming',
  asr TEXT NOT NULL DEFAULT 'upcoming',
  maghrib TEXT NOT NULL DEFAULT 'upcoming',
  isha TEXT NOT NULL DEFAULT 'upcoming',
  updated_at INTEGER NOT NULL -- milliseconds (Date.now())
);

-- 2️⃣ Sync Queue Table (PERSISTENT UNTIL SYNCED)
-- Stores prayer logs waiting to be synced to Supabase
-- Data persists until successfully synced (then DELETED)

CREATE TABLE IF NOT EXISTS prayer_sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL, -- YYYY-MM-DD format
  payload TEXT NOT NULL, -- JSON: {fajr: boolean, dhuhr: boolean, asr: boolean, maghrib: boolean, isha: boolean}
  created_at INTEGER NOT NULL -- milliseconds (Date.now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prayer_sync_queue_date ON prayer_sync_queue(date);
CREATE INDEX IF NOT EXISTS idx_prayer_sync_queue_created ON prayer_sync_queue(created_at);

-- 3️⃣ Quran Translations Table (ONE ROW PER EDITION, FULL JSON PAYLOAD)
-- Stores full Quran translation JSON for offline usage
CREATE TABLE IF NOT EXISTS quran_translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  edition_identifier TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL,
  name TEXT NOT NULL,
  direction TEXT NOT NULL, -- 'rtl' | 'ltr'
  data TEXT NOT NULL,      -- FULL QURAN JSON STRING (JSON.stringify)
  created_at INTEGER NOT NULL -- milliseconds (Date.now())
);

-- 4️⃣ Dhikr List Table
-- Stores user dhikr tracking records

CREATE TABLE IF NOT EXISTS dhikr_list (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  target_count INTEGER NOT NULL,
  current_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active','completed')),
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  is_dirty INTEGER NOT NULL DEFAULT 0,
  last_synced_at INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dhikr_list_user_slug ON dhikr_list(user_id, slug);
CREATE INDEX IF NOT EXISTS idx_dhikr_list_dirty ON dhikr_list(is_dirty);
