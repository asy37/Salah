import * as SQLite from "expo-sqlite";
import { debugLog } from "@/lib/utils/debugLog";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// NOTE:
// Metro bundler React Native ortamında .sql dosyalarını doğrudan import etmeyi
// desteklemediği için, runtime'da kullanılan schema'yı burada string olarak
// tanımlıyoruz. Aynı içerik ayrıca `schema.sql` içinde de mevcut ve
// "source of truth" dokümantasyonu olarak duruyor.
const SCHEMA_SQL = `
-- 1️⃣ Daily Prayer State Table (SINGLE ROW ONLY)
CREATE TABLE IF NOT EXISTS daily_prayer_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  date TEXT NOT NULL,
  fajr TEXT NOT NULL DEFAULT 'upcoming',
  dhuhr TEXT NOT NULL DEFAULT 'upcoming',
  asr TEXT NOT NULL DEFAULT 'upcoming',
  maghrib TEXT NOT NULL DEFAULT 'upcoming',
  isha TEXT NOT NULL DEFAULT 'upcoming',
  updated_at INTEGER NOT NULL
);

-- 2️⃣ Sync Queue Table (PERSISTENT UNTIL SYNCED)
CREATE TABLE IF NOT EXISTS prayer_sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prayer_sync_queue_date ON prayer_sync_queue(date);
CREATE INDEX IF NOT EXISTS idx_prayer_sync_queue_created ON prayer_sync_queue(created_at);

-- 3️⃣ Quran Translations Table (ONE ROW PER EDITION, FULL JSON PAYLOAD)
CREATE TABLE IF NOT EXISTS quran_translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  edition_identifier TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL,
  name TEXT NOT NULL,
  direction TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- 4️⃣ Dhikr List Table
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
`;

/**
 * SQLite connection & schema initialization
 *
 * - Uses single DB file for all local features (prayer tracking + Quran translations + dhikr)
 * - Runs `schema.sql` exactly once on first access
 * - Only async Expo SQLite API is used
 */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  debugLog("db.ts:getDb", "entry", { hasPromise: !!dbPromise });
  dbPromise ??= (async () => {
    try {
      debugLog("db.ts:getDb", "before openDatabaseAsync", {});
      const db = await SQLite.openDatabaseAsync("islamic_app.db");
      debugLog("db.ts:getDb", "before execAsync schema", {});
      await db.execAsync(SCHEMA_SQL);
      debugLog("db.ts:getDb", "SQLite init done", {});
      return db;
    } catch (err) {
      debugLog("db.ts:getDb", "SQLite init failed", { error: String(err) });
      dbPromise = null;
      throw err;
    }
  })();

  return dbPromise;
}
