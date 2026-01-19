/**
 * SQLite Repository for Offline-First Dhikr Tracking
 * 
 * This repository handles:
 * 1. Dhikr records (local storage with sync flags)
 * 2. Offline-first architecture with is_dirty flag
 */

import * as SQLite from 'expo-sqlite';

// Types
export interface DhikrRecord {
  id: string;
  user_id: string | null;
  slug: string;
  label: string;
  target_count: number;
  current_count: number;
  status: 'active' | 'completed';
  started_at: number;      // milliseconds
  completed_at: number | null;  // milliseconds | null
  is_dirty: boolean;
  last_synced_at: number | null; // milliseconds | null
  updated_at: number;      // milliseconds
}

class DhikrRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  /**
   * Initialize database and ensure tables exist
   */
  async initialize(): Promise<void> {
    if (this.db) return;

    // Using the same database name as getDb() for consistency
    this.db = await SQLite.openDatabaseAsync('islamic_app.db');
  }

  /**
   * Get dhikr by slug for a specific user
   */
  async getDhikrBySlug(userId: string | null, slug: string): Promise<DhikrRecord | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<{
      id: string;
      user_id: string | null;
      slug: string;
      label: string;
      target_count: number;
      current_count: number;
      status: string;
      started_at: number;
      completed_at: number | null;
      is_dirty: number; // SQLite stores as 0/1
      last_synced_at: number | null;
      updated_at: number;
    }>('SELECT * FROM dhikr_list WHERE user_id = ? AND slug = ?', [userId, slug]);

    if (!result) return null;

    return {
      id: result.id,
      user_id: result.user_id,
      slug: result.slug,
      label: result.label,
      target_count: result.target_count,
      current_count: result.current_count,
      status: result.status as 'active' | 'completed',
      started_at: result.started_at,
      completed_at: result.completed_at,
      is_dirty: result.is_dirty === 1,
      last_synced_at: result.last_synced_at,
      updated_at: result.updated_at,
    };
  }

  /**
   * Get all dhikrs for a user
   */
  async getAllDhikrs(userId: string | null): Promise<DhikrRecord[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<{
      id: string;
      user_id: string | null;
      slug: string;
      label: string;
      target_count: number;
      current_count: number;
      status: string;
      started_at: number;
      completed_at: number | null;
      is_dirty: number;
      last_synced_at: number | null;
      updated_at: number;
    }>('SELECT * FROM dhikr_list WHERE user_id = ? ORDER BY started_at DESC', [userId]);

    return results.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      slug: row.slug,
      label: row.label,
      target_count: row.target_count,
      current_count: row.current_count,
      status: row.status as 'active' | 'completed',
      started_at: row.started_at,
      completed_at: row.completed_at,
      is_dirty: row.is_dirty === 1,
      last_synced_at: row.last_synced_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * Get all dirty dhikrs (needs sync)
   */
  async getDirtyDhikrs(userId: string | null): Promise<DhikrRecord[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<{
      id: string;
      user_id: string | null;
      slug: string;
      label: string;
      target_count: number;
      current_count: number;
      status: string;
      started_at: number;
      completed_at: number | null;
      is_dirty: number;
      last_synced_at: number | null;
      updated_at: number;
    }>('SELECT * FROM dhikr_list WHERE user_id = ? AND is_dirty = 1', [userId]);

    return results.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      slug: row.slug,
      label: row.label,
      target_count: row.target_count,
      current_count: row.current_count,
      status: row.status as 'active' | 'completed',
      started_at: row.started_at,
      completed_at: row.completed_at,
      is_dirty: row.is_dirty === 1,
      last_synced_at: row.last_synced_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * Get active dhikr (for backward compatibility)
   */
  async getActiveDhikrByUser(userId: string): Promise<DhikrRecord | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<{
      id: string;
      user_id: string | null;
      slug: string;
      label: string;
      target_count: number;
      current_count: number;
      status: string;
      started_at: number;
      completed_at: number | null;
      is_dirty: number;
      last_synced_at: number | null;
      updated_at: number;
    }>('SELECT * FROM dhikr_list WHERE user_id = ? AND status = ? LIMIT 1', [userId, 'active']);

    if (!result) return null;

    return {
      id: result.id,
      user_id: result.user_id,
      slug: result.slug,
      label: result.label,
      target_count: result.target_count,
      current_count: result.current_count,
      status: result.status as 'active' | 'completed',
      started_at: result.started_at,
      completed_at: result.completed_at,
      is_dirty: result.is_dirty === 1,
      last_synced_at: result.last_synced_at,
      updated_at: result.updated_at,
    };
  }

  /**
   * Upsert dhikr record (insert or update)
   * Always marks as dirty on update
   */
  async upsertDhikr(dhikr: DhikrRecord): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();

    await this.db.runAsync(
      `INSERT INTO dhikr_list (
        id, user_id, slug, label, target_count, current_count, status,
        started_at, completed_at, is_dirty, last_synced_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id,
        slug = excluded.slug,
        label = excluded.label,
        target_count = excluded.target_count,
        current_count = excluded.current_count,
        status = excluded.status,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at,
        is_dirty = 1,
        last_synced_at = excluded.last_synced_at,
        updated_at = ?`,
      [
        dhikr.id,
        dhikr.user_id,
        dhikr.slug,
        dhikr.label,
        dhikr.target_count,
        dhikr.current_count,
        dhikr.status,
        dhikr.started_at,
        dhikr.completed_at,
        dhikr.is_dirty ? 1 : 0,
        dhikr.last_synced_at,
        now,
        now, // updated_at on conflict
      ]
    );
  }

  /**
   * Mark dhikr as synced (clear dirty flag, update last_synced_at)
   */
  async markDhikrSynced(id: string): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    await this.db.runAsync(
      'UPDATE dhikr_list SET is_dirty = 0, last_synced_at = ?, updated_at = ? WHERE id = ?',
      [now, now, id]
    );
  }

  /**
   * Reset dhikr (restart counting)
   */
  async resetDhikr(id: string): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    await this.db.runAsync(
      `UPDATE dhikr_list SET
        current_count = 0,
        status = 'active',
        started_at = ?,
        completed_at = NULL,
        is_dirty = 1,
        updated_at = ?
      WHERE id = ?`,
      [now, now, id]
    );
  }

  async  getDhikrStats(
    userId: string,
    start: number,
    end: number
  ) {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
  
    const completed = await this.db.getFirstAsync<{ count: number }>(
      `
      SELECT COUNT(*) as count
      FROM dhikr_list
      WHERE user_id = ?
        AND status = 'completed'
        AND completed_at BETWEEN ? AND ?
      `,
      [userId, start, end]
    );
  
    const active = await this.db.getFirstAsync<{ count: number }>(
      `
      SELECT COUNT(*) as count
      FROM dhikr_list
      WHERE user_id = ?
        AND started_at <= ?
        AND (completed_at IS NULL OR completed_at > ?)
      `,
      [userId, end, end]
    );
  
    return {
      completed: completed?.count ?? 0,
      active: active?.count ?? 0,
    };
  }
}

// Singleton instance
export const dhikrRepo = new DhikrRepository();
