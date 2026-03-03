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

-- 5️⃣ Duas Table
-- Stores user's personal duas (offline-first)
CREATE TABLE IF NOT EXISTS duas (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_duas_user_id ON duas(user_id);
CREATE INDEX IF NOT EXISTS idx_duas_updated_at ON duas(updated_at);

-- 6️⃣ Sync Queue Table
-- Stores pending sync operations for duas
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dua_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(dua_id, action)
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_dua_id ON sync_queue(dua_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at);

-- 7️⃣ User Profile Cache (offline-first profile display)
CREATE TABLE IF NOT EXISTS user_profile_cache (
  user_id TEXT PRIMARY KEY,
  name TEXT,
  surname TEXT,
  image TEXT,
  is_anonymous INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 8️⃣ Profile Sync Queue (pending profile updates for Supabase)
CREATE TABLE IF NOT EXISTS profile_sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profile_sync_queue_user_id ON profile_sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_sync_queue_created_at ON profile_sync_queue(created_at);

-- 9️⃣ Prayer Times Month Cache (Aladhan calendar API – one row per month per location)
CREATE TABLE IF NOT EXISTS prayer_times_month_cache (
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  method INTEGER NOT NULL,
  data TEXT NOT NULL,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (year, month, latitude, longitude, method)
);

-- 🔟 Prayer Times Sync Queue (when month changes offline – fetch on reconnect)
CREATE TABLE IF NOT EXISTS prayer_times_sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  method INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prayer_times_sync_queue_created ON prayer_times_sync_queue(created_at);
