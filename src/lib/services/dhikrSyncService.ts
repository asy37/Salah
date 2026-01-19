/**
 * Dhikr Sync Service
 * Handles synchronization between SQLite (local) and Supabase (cloud)
 * 
 * Architecture:
 * - SQLite is the source of truth
 * - Only syncs dirty records (is_dirty = true)
 * - Only syncs for authenticated users (not guests)
 * - Syncs max once every 24 hours
 * - Never blocks UI
 * - Fails silently and retries later
 */

import { supabase } from '@/lib/supabase/client';
import { dhikrRepo, type DhikrRecord } from '@/lib/database/sqlite/dhikr/repository';
import { storage } from '@/lib/storage/mmkv';

const LAST_SYNC_KEY = 'dhikr_last_sync_timestamp';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface SyncResult {
  success: boolean;
  syncedCount: number;
  skippedCount: number;
  errorCount: number;
}

class DhikrSyncService {
  private isSyncing = false;

  /**
   * Check if device is online
   */
  private async isOnline(): Promise<boolean> {
    try {
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if user is authenticated (not guest)
   */
  private async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session?.user;
    } catch {
      return false;
    }
  }

  /**
   * Check if sync is needed (24h passed since last sync)
   */
  private async shouldSync(): Promise<boolean> {
    try {
      const lastSyncStr = await storage.getString(LAST_SYNC_KEY);
      if (!lastSyncStr) return true; // Never synced

      const lastSync = parseInt(lastSyncStr, 10);
      if (isNaN(lastSync)) return true; // Invalid timestamp

      const now = Date.now();
      const timeSinceLastSync = now - lastSync;
      return timeSinceLastSync >= ONE_DAY_MS;
    } catch {
      return true; // On error, allow sync
    }
  }

  /**
   * Convert DhikrRecord to sync payload (exclude local-only fields)
   */
  private recordToSyncPayload(record: DhikrRecord): Omit<DhikrRecord, 'user_id' | 'is_dirty' | 'last_synced_at'> {
    return {
      id: record.id,
      slug: record.slug,
      label: record.label,
      target_count: record.target_count,
      current_count: record.current_count,
      status: record.status,
      started_at: record.started_at,
      completed_at: record.completed_at,
      updated_at: record.updated_at,
    };
  }

  /**
   * Sync dirty dhikrs to Supabase
   * 
   * This function:
   * - Checks authentication (only authenticated users)
   * - Checks internet connectivity
   * - Checks 24h cooldown
   * - Fetches dirty records from SQLite
   * - Calls Supabase Edge Function
   * - Marks synced records as clean
   * - Never throws uncaught errors
   */
  async syncDhikrsIfNeeded(): Promise<SyncResult> {
    // Prevent concurrent syncs
    if (this.isSyncing) {
      return {
        success: false,
        syncedCount: 0,
        skippedCount: 0,
        errorCount: 0,
      };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: false,
      syncedCount: 0,
      skippedCount: 0,
      errorCount: 0,
    };

    try {
      // Check authentication (only sync for authenticated users)
      const authenticated = await this.isAuthenticated();
      if (!authenticated) {
        // Guest users never sync - this is expected, not an error
        this.isSyncing = false;
        return result;
      }

      // Check internet connectivity
      const online = await this.isOnline();
      if (!online) {
        this.isSyncing = false;
        return result;
      }

      // Check 24h cooldown
      const shouldSync = await this.shouldSync();
      if (!shouldSync) {
        this.isSyncing = false;
        return result;
      }

      // Get authenticated user ID
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        this.isSyncing = false;
        return result;
      }

      const userId = session.user.id;

      // Fetch dirty records from SQLite
      const dirtyRecords = await dhikrRepo.getDirtyDhikrs(userId);

      if (dirtyRecords.length === 0) {
        // No dirty records, update last sync time anyway
        await storage.set(LAST_SYNC_KEY, Date.now().toString());
        this.isSyncing = false;
        result.success = true;
        return result;
      }

      // Convert to sync payload (exclude local-only fields)
      const syncPayload = dirtyRecords.map(record => this.recordToSyncPayload(record));

      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('sync_dhikr', {
        body: { dhikrs: syncPayload },
      });

      if (error) {
        console.error('[DhikrSync] Edge function error:', error);
        this.isSyncing = false;
        return result;
      }

      // Process response
      const response = data as {
        syncedIds: string[];
        skippedIds: string[];
        errors: Array<{ id: string; error: string }>;
      };

      // Mark successfully synced records as clean
      for (const id of response.syncedIds) {
        try {
          await dhikrRepo.markDhikrSynced(id);
          result.syncedCount++;
        } catch (error) {
          console.error(`[DhikrSync] Error marking ${id} as synced:`, error);
          result.errorCount++;
        }
      }

      // Log skipped records (conflict resolution - server has newer version)
      result.skippedCount = response.skippedIds.length;
      if (result.skippedCount > 0) {
        console.log(`[DhikrSync] Skipped ${result.skippedCount} records (server has newer version)`);
      }

      // Log errors
      result.errorCount += response.errors.length;
      if (response.errors.length > 0) {
        console.error('[DhikrSync] Sync errors:', response.errors);
      }

      // Update last sync timestamp
      await storage.set(LAST_SYNC_KEY, Date.now().toString());

      result.success = result.errorCount === 0;
    } catch (error) {
      // Fail silently - don't throw, just log
      console.error('[DhikrSync] Sync exception:', error);
      result.success = false;
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Get sync status (for debugging/monitoring)
   */
  async getSyncStatus(): Promise<{
    isSyncing: boolean;
    lastSyncTimestamp: number | null;
    canSync: boolean;
  }> {
    const lastSyncStr = await storage.getString(LAST_SYNC_KEY);
    const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : null;
    const authenticated = await this.isAuthenticated();
    const online = await this.isOnline();
    const shouldSync = await this.shouldSync();

    return {
      isSyncing: this.isSyncing,
      lastSyncTimestamp: lastSync,
      canSync: authenticated && online && shouldSync && !this.isSyncing,
    };
  }
}

// Singleton instance
export const dhikrSyncService = new DhikrSyncService();
