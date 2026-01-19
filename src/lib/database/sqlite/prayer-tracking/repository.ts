/**
 * SQLite Repository for Offline-First Prayer Tracking
 * 
 * This repository handles:
 * 1. Daily prayer state (local only, reset daily)
 * 2. Sync queue (persistent until synced)
 */

import * as SQLite from 'expo-sqlite';
import type { PrayerStatus, PrayerName } from '@/types/prayer-tracking';

// Types
export interface DailyPrayerState {
  date: string; // YYYY-MM-DD
  fajr: PrayerStatus;
  dhuhr: PrayerStatus;
  asr: PrayerStatus;
  maghrib: PrayerStatus;
  isha: PrayerStatus;
  created_at: number;
  updated_at: number;
}

export interface SyncQueueItem {
  id: number;
  date: string; // YYYY-MM-DD
  payload: {
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
  };
  created_at: number; // milliseconds
}

class PrayerTrackingRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  /**
   * Initialize database and create tables
   */
  async initialize(): Promise<void> {
    if (this.db) return;

    // Using the same database name as getDb() for consistency
    this.db = await SQLite.openDatabaseAsync('islamic_app.db');
    
    // Create tables
    const schema = `
      -- Daily Prayer State Table (SINGLE ROW ONLY)
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

      -- Sync Queue Table (NO synced flag - DELETE on success)
      CREATE TABLE IF NOT EXISTS prayer_sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_prayer_sync_queue_date ON prayer_sync_queue(date);
      CREATE INDEX IF NOT EXISTS idx_prayer_sync_queue_created ON prayer_sync_queue(created_at);
    `;

    await this.db.execAsync(schema);
  }

  /**
   * Get current prayer state (single row table)
   */
  async getCurrentPrayerState(): Promise<DailyPrayerState | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<{
      id: number;
      date: string;
      fajr: string;
      dhuhr: string;
      asr: string;
      maghrib: string;
      isha: string;
      updated_at: number;
    }>('SELECT * FROM daily_prayer_state WHERE id = 1');

    if (!result) return null;

    return {
      date: result.date,
      fajr: result.fajr as PrayerStatus,
      dhuhr: result.dhuhr as PrayerStatus,
      asr: result.asr as PrayerStatus,
      maghrib: result.maghrib as PrayerStatus,
      isha: result.isha as PrayerStatus,
      created_at: result.updated_at, // For compatibility
      updated_at: result.updated_at,
    };
  }

  /**
   * Create or update prayer state (single row)
   */
  async upsertPrayerState(
    date: string,
    prayer: PrayerName,
    status: PrayerStatus
  ): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now(); // milliseconds

    // Check if record exists
    const existing = await this.getCurrentPrayerState();

    if (existing) {
      // Update existing record
      await this.db.runAsync(
        `UPDATE daily_prayer_state 
         SET ${prayer} = ?, updated_at = ?, date = ?
         WHERE id = 1`,
        [status, now, date]
      );
    } else {
      // Create new record with default values
      const defaults: Record<PrayerName, PrayerStatus> = {
        fajr: 'upcoming',
        dhuhr: 'upcoming',
        asr: 'upcoming',
        maghrib: 'upcoming',
        isha: 'upcoming',
      };

      defaults[prayer] = status;

      await this.db.runAsync(
        `INSERT INTO daily_prayer_state (id, date, fajr, dhuhr, asr, maghrib, isha, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
        [
          date,
          defaults.fajr,
          defaults.dhuhr,
          defaults.asr,
          defaults.maghrib,
          defaults.isha,
          now,
        ]
      );
    }
  }

  /**
   * Reset daily prayer state for new day (UPDATE or DELETE + INSERT)
   */
  async resetDailyPrayerState(date: string): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now(); // milliseconds

    // Check if record exists
    const existing = await this.getCurrentPrayerState();

    if (existing) {
      // UPDATE: Reset all prayers to 'upcoming' and update date
      await this.db.runAsync(
        `UPDATE daily_prayer_state 
         SET date = ?, 
             fajr = 'upcoming', 
             dhuhr = 'upcoming', 
             asr = 'upcoming', 
             maghrib = 'upcoming', 
             isha = 'upcoming',
             updated_at = ?
         WHERE id = 1`,
        [date, now]
      );
    } else {
      // INSERT: Create new record with defaults
      await this.db.runAsync(
        `INSERT INTO daily_prayer_state (id, date, fajr, dhuhr, asr, maghrib, isha, updated_at)
         VALUES (1, ?, 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming', ?)`,
        [date, now]
      );
    }
  }

  /**
   * Convert daily prayer state to boolean payload for sync
   */
  private convertStateToPayload(state: DailyPrayerState): {
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
  } {
    return {
      fajr: state.fajr === 'prayed',
      dhuhr: state.dhuhr === 'prayed',
      asr: state.asr === 'prayed',
      maghrib: state.maghrib === 'prayed',
      isha: state.isha === 'prayed',
    };
  }

  /**
   * Add prayer log to sync queue (called at day reset)
   */
  async addToSyncQueue(date: string, state: DailyPrayerState): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const payload = this.convertStateToPayload(state);
    const payloadJson = JSON.stringify(payload);
    const now = Date.now(); // milliseconds

    await this.db.runAsync(
      `INSERT INTO prayer_sync_queue (date, payload, created_at)
       VALUES (?, ?, ?)`,
      [date, payloadJson, now]
    );
  }

  /**
   * Get all pending items from queue (all items are pending until deleted)
   */
  async getPendingQueueItems(): Promise<SyncQueueItem[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<{
      id: number;
      date: string;
      payload: string;
      created_at: number;
    }>('SELECT * FROM prayer_sync_queue ORDER BY created_at ASC');

    return results.map((row) => ({
      id: row.id,
      date: row.date,
      payload: JSON.parse(row.payload),
      created_at: row.created_at,
    }));
  }

  /**
   * Delete queue item after successful sync
   */
  async deleteQueueItem(id: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM prayer_sync_queue WHERE id = ?', [id]);
  }

  /**
   * Get queue item by ID
   */
  async getQueueItemById(id: number): Promise<SyncQueueItem | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<{
      id: number;
      date: string;
      payload: string;
      created_at: number;
    }>('SELECT * FROM prayer_sync_queue WHERE id = ?', [id]);

    if (!result) return null;

    return {
      id: result.id,
      date: result.date,
      payload: JSON.parse(result.payload),
      created_at: result.created_at,
    };
  }
}

// Singleton instance
export const prayerTrackingRepo = new PrayerTrackingRepository();

