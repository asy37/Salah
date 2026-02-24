/**
 * SQLite Repository for Offline-First User Profile
 * Cache + sync queue for profile (name, surname, image, is_anonymous).
 */

import * as SQLite from 'expo-sqlite';
import { getDb } from '../db';
import type { UserProfile, UpdateUserProfileInput } from '@/lib/api/services/profile';

export interface ProfileSyncQueueItem {
  id: number;
  user_id: string;
  payload: string;
  created_at: number;
}

class ProfileRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    if (this.db) return;
    this.db = await getDb();
  }

  async getLocalProfile(userId: string): Promise<UserProfile | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync<{
      user_id: string;
      name: string | null;
      surname: string | null;
      image: string | null;
      is_anonymous: number;
      created_at: number;
      updated_at: number;
    }>('SELECT * FROM user_profile_cache WHERE user_id = ?', [userId]);

    if (!row) return null;

    return {
      id: row.user_id,
      name: row.name,
      surname: row.surname,
      image: row.image,
      is_anonymous: row.is_anonymous === 1,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  async upsertLocalProfile(userId: string, profile: UserProfile): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const created_at =
      typeof profile.created_at === 'number'
        ? profile.created_at
        : new Date(profile.created_at).getTime();
    const updated_at =
      typeof profile.updated_at === 'number'
        ? profile.updated_at
        : new Date(profile.updated_at).getTime();

    await this.db.runAsync(
      `INSERT INTO user_profile_cache (user_id, name, surname, image, is_anonymous, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         name = excluded.name,
         surname = excluded.surname,
         image = excluded.image,
         is_anonymous = excluded.is_anonymous,
         updated_at = excluded.updated_at`,
      [
        userId,
        profile.name ?? null,
        profile.surname ?? null,
        profile.image ?? null,
        profile.is_anonymous ? 1 : 0,
        created_at,
        updated_at,
      ]
    );
  }

  async addToProfileSyncQueue(
    userId: string,
    payload: UpdateUserProfileInput
  ): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    const payloadJson = JSON.stringify(payload);

    // Single pending update per user: delete existing then insert
    await this.db.runAsync(
      'DELETE FROM profile_sync_queue WHERE user_id = ?',
      [userId]
    );
    await this.db.runAsync(
      `INSERT INTO profile_sync_queue (user_id, payload, created_at) VALUES (?, ?, ?)`,
      [userId, payloadJson, now]
    );
  }

  async getProfileSyncQueueItem(): Promise<ProfileSyncQueueItem | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const row = await this.db.getFirstAsync<{
      id: number;
      user_id: string;
      payload: string;
      created_at: number;
    }>('SELECT * FROM profile_sync_queue ORDER BY created_at ASC LIMIT 1');

    if (!row) return null;
    return {
      id: row.id,
      user_id: row.user_id,
      payload: row.payload,
      created_at: row.created_at,
    };
  }

  async removeProfileSyncQueueItem(id: number): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM profile_sync_queue WHERE id = ?', [
      id,
    ]);
  }
}

export const profileRepo = new ProfileRepository();
