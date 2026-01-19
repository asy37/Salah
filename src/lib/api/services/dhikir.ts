/**
 * Dhikr Sync Service
 * 
 * Offline-first sync service for Dhikr records
 * 
 * Architecture:
 * - SQLite is the source of truth
 * - Only syncs dirty records (is_dirty = true)
 * - Only syncs for authenticated users (not guests)
 * - Syncs max once every 24 hours per user
 * - Never blocks UI
 * - Fails silently and retries later
 * 
 * Flow:
 * 1. Check if user is logged in
 * 2. Check if internet is available
 * 3. Check if 24 hours passed since last sync (user-specific)
 * 4. Check if there are dirty records in SQLite
 * 5. Call Supabase Edge Function (sync_dhikr)
 * 6. On success → Mark records as clean in SQLite
 */

import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/lib/supabase/client';
import { dhikrRepo, type DhikrRecord } from '@/lib/database/sqlite/dhikr/repository';
import { storage } from '@/lib/storage/mmkv';

const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Get user-specific last sync key
 * Ensures multi-user scenarios work correctly
 */
const getLastSyncKey = (userId: string): string => `dhikr_last_sync_${userId}`;

interface SyncResult {
  success: boolean;
  syncedCount: number;
  errorCount: number;
  message?: string;
}

class DhikrSyncService {
  private isSyncing = false;

  /**
   * Get current authenticated user
   * Returns user and userId, or null if not authenticated
   * Consolidates auth checks to avoid redundant getUser() calls
   */
  private async getAuthenticatedUser(): Promise<{ user: { id: string }; userId: string } | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user?.id) {
        return null;
      }
      return { user, userId: user.id };
    } catch (error) {
      console.error('[DhikrSync] Error checking auth:', error);
      return null;
    }
  }

  /**
   * Check if internet is available
   * Uses NetInfo for reliable mobile network detection
   */
  private async isInternetAvailable(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return Boolean(state.isConnected && state.isInternetReachable);
    } catch (error) {
      console.error('[DhikrSync] Error checking network:', error);
      return false;
    }
  }

  /**
   * Check if 24 hours passed since last sync (user-specific)
   */
  private async shouldSync(userId: string): Promise<boolean> {
    try {
      const lastSyncKey = getLastSyncKey(userId);
      const lastSyncStr = await storage.getString(lastSyncKey);
      
      if (!lastSyncStr) {
        return true; // Never synced before
      }

      const lastSync = Number.parseInt(lastSyncStr, 10);
      
      if (Number.isNaN(lastSync)) {
        return true; // Invalid timestamp
      }

      const now = Date.now();
      const timeSinceLastSync = now - lastSync;
      
      return timeSinceLastSync >= ONE_DAY_MS;
    } catch (error) {
      console.error('[DhikrSync] Error checking sync time:', error);
      return true; // Fail open: allow sync on error
    }
  }

  /**
   * Get dirty records from SQLite
   */
  private async getDirtyRecords(userId: string): Promise<DhikrRecord[]> {
    try {
      return await dhikrRepo.getDirtyDhikrs(userId);
    } catch (error) {
      console.error('[DhikrSync] Error fetching dirty records:', error);
      return [];
    }
  }

  /**
   * Call Supabase Edge Function
   * Returns syncedIds (processed records) and errors
   */
  private async callSyncEdgeFunction(
    dhikrs: Omit<DhikrRecord, 'user_id' | 'is_dirty' | 'last_synced_at'>[]
  ): Promise<{ syncedIds: string[]; errors: Array<{ id: string; error: string }> }> {
    try {
      const { data, error } = await supabase.functions.invoke('sync_dhikr', {
        body: { dhikrs },
      });

      if (error) {
        throw error;
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from Edge Function');
      }

      const response = data as {
        syncedIds?: string[];
        errors?: Array<{ id: string; error: string }>;
      };

      return {
        syncedIds: response.syncedIds || [],
        errors: response.errors || [],
      };
    } catch (error) {
      console.error('[DhikrSync] Edge Function error:', error);
      throw error;
    }
  }

  /**
   * Mark records as clean in SQLite
   * Processes all syncedIds regardless of errors
   */
  private async markRecordsAsSynced(ids: string[]): Promise<void> {
    for (const id of ids) {
      try {
        await dhikrRepo.markDhikrSynced(id);
      } catch (error) {
        console.error(`[DhikrSync] Error marking ${id} as synced:`, error);
      }
    }
  }

  /**
   * Main sync function
   * 
   * Performs all checks and syncs dirty records if conditions are met.
   * Never throws errors - fails silently and returns result.
   */
  async syncDhikrsIfNeeded(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        syncedCount: 0,
        errorCount: 0,
        message: 'Sync already in progress',
      };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: false,
      syncedCount: 0,
      errorCount: 0,
    };

    try {
      // 1. Get authenticated user (consolidated auth check)
      const auth = await this.getAuthenticatedUser();
      if (!auth) {
        result.message = 'User not logged in';
        this.isSyncing = false;
        return result;
      }
      const { userId } = auth;

      // 2. Check if internet is available
      const hasInternet = await this.isInternetAvailable();
      if (!hasInternet) {
        result.message = 'No internet connection';
        return result;
      }

      // 3. Check if 24 hours passed (user-specific)
      const shouldSync = await this.shouldSync(userId);
      if (!shouldSync) {
        result.message = '24 hours have not passed since last sync';
        return result;
      }

      // 4. Get dirty records from SQLite
      const dirtyRecords = await this.getDirtyRecords(userId);
      if (dirtyRecords.length === 0) {
        // No dirty records, but update last sync time anyway
        const lastSyncKey = getLastSyncKey(userId);
        await storage.set(lastSyncKey, Date.now().toString());
        result.success = true;
        result.message = 'No dirty records to sync';
        return result;
      }

      // Prepare sync payload (exclude local-only fields)
      // Ensure timestamps are numbers (milliseconds) as expected by Edge Function
      const syncPayload = dirtyRecords.map((record) => ({
        id: record.id,
        slug: record.slug,
        label: record.label,
        target_count: record.target_count,
        current_count: record.current_count,
        status: record.status,
        started_at: Number(record.started_at),
        completed_at: record.completed_at ? Number(record.completed_at) : null,
        updated_at: Number(record.updated_at),
      }));

      // 5. Call Supabase Edge Function
      const { syncedIds, errors } = await this.callSyncEdgeFunction(syncPayload);

      // 6. Mark successfully synced records as clean
      // Process all syncedIds regardless of errors
      if (syncedIds.length > 0) {
        await this.markRecordsAsSynced(syncedIds);
        result.syncedCount = syncedIds.length;
      }

      // Count errors
      result.errorCount = errors.length;
      if (errors.length > 0) {
        console.error('[DhikrSync] Sync errors:', errors);
      }

      // Update last sync timestamp (user-specific)
      // Only update if we successfully processed records (even with some errors)
      // This ensures we don't retry immediately on partial success
      const lastSyncKey = getLastSyncKey(userId);
      await storage.set(lastSyncKey, Date.now().toString());

      // Success = no errors (syncedIds may be less than dirtyRecords due to conflict resolution)
      result.success = result.errorCount === 0;
      const errorMsg = result.errorCount > 0 ? `, ${result.errorCount} errors` : '';
      result.message = `Synced ${result.syncedCount} records${errorMsg}`;
    } catch (error) {
      console.error('[DhikrSync] Sync exception:', error);
      result.success = false;
      result.errorCount = result.errorCount || 1;
      result.message = error instanceof Error ? error.message : 'Unknown error';
      // Note: lastSync timestamp is NOT updated on exception (correct behavior)
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Get sync status (for debugging/monitoring)
   * 
   * NOTE: This function is intended for development/debugging purposes.
   * Do not rely on it for production logic.
   */
  async getSyncStatus(): Promise<{
    isSyncing: boolean;
    lastSyncTimestamp: number | null;
    canSync: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let canSync = true;

    const auth = await this.getAuthenticatedUser();
    if (!auth) {
      canSync = false;
      reasons.push('User not logged in');
    }

    const userId = auth?.userId;
    const lastSyncKey = userId ? getLastSyncKey(userId) : null;
    const lastSyncStr = lastSyncKey ? await storage.getString(lastSyncKey) : null;
    const lastSync = lastSyncStr ? Number.parseInt(lastSyncStr, 10) : null;

    const hasInternet = await this.isInternetAvailable();
    if (!hasInternet) {
      canSync = false;
      reasons.push('No internet connection');
    }

    const shouldSync = userId ? await this.shouldSync(userId) : false;
    if (!shouldSync) {
      canSync = false;
      reasons.push('24 hours have not passed');
    }

    if (this.isSyncing) {
      canSync = false;
      reasons.push('Sync already in progress');
    }

    return {
      isSyncing: this.isSyncing,
      lastSyncTimestamp: lastSync,
      canSync,
      reasons,
    };
  }
}

// Singleton instance
export const dhikrSyncService = new DhikrSyncService();
