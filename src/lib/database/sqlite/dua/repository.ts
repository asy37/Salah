/**
 * SQLite Repository for Offline-First Dua Defterim
 * 
 * This repository handles:
 * 1. Dua CRUD operations (local storage)
 * 2. Sync queue management (offline operations)
 * 3. Edge case handling (delete wins over update)
 */

import * as SQLite from 'expo-sqlite';
import { getDb } from '../db';
import type { Dua, SyncQueueItem } from '@/types/dua';

class DuaRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    if (this.db) return;
    this.db = await getDb();
  }

  /**
   * Get all duas for a user
   */
  async getAllDuas(userId: string): Promise<Dua[]> {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'repository.ts:getAllDuas',message:'getAllDuas entry',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'repository.ts:getAllDuas',message:'before SELECT',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const results = await this.db.getAllAsync<{
      id: string;
      user_id: string;
      title: string;
      text: string;
      is_favorite: number; // SQLite stores as 0/1
      created_at: number;
      updated_at: number;
    }>('SELECT * FROM duas WHERE user_id = ? ORDER BY updated_at DESC', [userId]);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'repository.ts:getAllDuas',message:'after SELECT',data:{resultCount:results.length,resultIds:results.map(r=>r.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    return results.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      text: row.text,
      is_favorite: row.is_favorite === 1,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * Get a single dua by ID
   */
  async getDuaById(duaId: string, userId: string): Promise<Dua | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<{
      id: string;
      user_id: string;
      title: string;
      text: string;
      is_favorite: number;
      created_at: number;
      updated_at: number;
    }>('SELECT * FROM duas WHERE id = ? AND user_id = ?', [duaId, userId]);

    if (!result) return null;

    return {
      id: result.id,
      user_id: result.user_id,
      title: result.title,
      text: result.text,
      is_favorite: result.is_favorite === 1,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  }

  /**
   * Check if a dua has a pending delete in sync_queue
   */
  private async hasPendingDelete(duaId: string): Promise<boolean> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sync_queue WHERE dua_id = ? AND action = ?',
      [duaId, 'delete']
    );

    return (result?.count ?? 0) > 0;
  }

  /**
   * CREATE: Insert dua into SQLite and sync_queue (if offline)
   */
  async createDua(dua: Dua, isOnline: boolean): Promise<void> {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'repository.ts:createDua',message:'createDua entry',data:{duaId:dua.id,userId:dua.user_id,isOnline},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();

    // Insert into duas table
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'repository.ts:createDua',message:'before INSERT',data:{duaId:dua.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    await this.db.runAsync(
      `INSERT INTO duas (id, user_id, title, text, is_favorite, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        dua.id,
        dua.user_id,
        dua.title,
        dua.text,
        dua.is_favorite ? 1 : 0,
        dua.created_at || now,
        dua.updated_at || now,
      ]
    );
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'repository.ts:createDua',message:'after INSERT',data:{duaId:dua.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // If offline, add to sync_queue
    if (!isOnline) {
      const payload = JSON.stringify({
        id: dua.id,
        title: dua.title,
        text: dua.text,
        is_favorite: dua.is_favorite,
        created_at: dua.created_at || now,
        updated_at: dua.updated_at || now,
      });

      // Use INSERT OR REPLACE to handle unique constraint (dua_id, action)
      await this.db.runAsync(
        `INSERT OR REPLACE INTO sync_queue (dua_id, action, payload, created_at)
         VALUES (?, ?, ?, ?)`,
        [dua.id, 'create', payload, now]
      );
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'repository.ts:createDua',message:'createDua exit',data:{duaId:dua.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  }

  /**
   * UPDATE: Update dua in SQLite and sync_queue (if offline)
   * Edge case: If pending delete exists, do NOT allow update
   */
  async updateDua(dua: Dua, isOnline: boolean): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    // Edge case: If pending delete exists, do NOT allow update
    const hasDelete = await this.hasPendingDelete(dua.id);
    if (hasDelete) {
      throw new Error('Cannot update dua: pending delete operation exists');
    }

    const now = Date.now();

    // Update duas table
    await this.db.runAsync(
      `UPDATE duas SET
        title = ?,
        text = ?,
        is_favorite = ?,
        updated_at = ?
       WHERE id = ? AND user_id = ?`,
      [
        dua.title,
        dua.text,
        dua.is_favorite ? 1 : 0,
        now,
        dua.id,
        dua.user_id,
      ]
    );

    // If offline, add/update sync_queue
    if (!isOnline) {
      const payload = JSON.stringify({
        id: dua.id,
        title: dua.title,
        text: dua.text,
        is_favorite: dua.is_favorite,
        created_at: dua.created_at,
        updated_at: now,
      });

      // Use INSERT OR REPLACE to overwrite existing (dua_id, "update") entry
      await this.db.runAsync(
        `INSERT OR REPLACE INTO sync_queue (dua_id, action, payload, created_at)
         VALUES (?, ?, ?, ?)`,
        [dua.id, 'update', payload, now]
      );
    }
  }

  /**
   * DELETE: Remove dua from SQLite and add to sync_queue (if offline)
   */
  async deleteDua(duaId: string, userId: string, isOnline: boolean): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    // Delete from duas table
    await this.db.runAsync(
      'DELETE FROM duas WHERE id = ? AND user_id = ?',
      [duaId, userId]
    );

    // If offline, add to sync_queue
    if (!isOnline) {
      const now = Date.now();
      const payload = JSON.stringify({ id: duaId });

      // Use INSERT OR REPLACE to handle unique constraint
      await this.db.runAsync(
        `INSERT OR REPLACE INTO sync_queue (dua_id, action, payload, created_at)
         VALUES (?, ?, ?, ?)`,
        [duaId, 'delete', payload, now]
      );
    }
  }

  /**
   * Get all sync queue items ordered by created_at
   */
  async getSyncQueueItems(): Promise<SyncQueueItem[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<{
      id: number;
      dua_id: string;
      action: string;
      payload: string;
      created_at: number;
    }>('SELECT * FROM sync_queue ORDER BY created_at ASC');

    return results.map((row) => ({
      id: row.id,
      dua_id: row.dua_id,
      action: row.action as 'create' | 'update' | 'delete',
      payload: row.payload,
      created_at: row.created_at,
    }));
  }

  /**
   * Remove sync queue item after successful sync
   */
  async removeSyncQueueItem(queueId: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM sync_queue WHERE id = ?', [queueId]);
  }

  /**
   * Clear all sync queue items (for testing/debugging)
   */
  async clearSyncQueue(): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM sync_queue');
  }
}

// Singleton instance
export const duaRepo = new DuaRepository();
