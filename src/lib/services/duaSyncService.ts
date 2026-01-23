/**
 * Dua Sync Service
 * Handles synchronization between SQLite (local) and Supabase (cloud)
 * 
 * Architecture:
 * - SQLite is the source of truth
 * - Sync queue contains pending operations
 * - Only syncs when internet is available
 * - Processes queue in order (FIFO)
 * - Stops on first failure
 */

import { supabase } from '@/lib/supabase/client';
import { duaRepo } from '@/lib/database/sqlite/dua/repository';
import type { SyncQueueItem } from '@/types/dua';
import NetInfo from '@react-native-community/netinfo';

interface SyncResult {
  success: boolean;
  syncedCount: number;
  errorCount: number;
  message: string;
}

class DuaSyncService {
  private isSyncing = false;

  /**
   * Check if internet is available
   */
  private async isInternetAvailable(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return Boolean(state.isConnected && state.isInternetReachable);
    } catch (error) {
      console.error('[DuaSync] Error checking network:', error);
      return false;
    }
  }

  /**
   * Get authenticated user ID
   */
  private async getUserId(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.id ?? null;
    } catch (error) {
      console.error('[DuaSync] Error getting user:', error);
      return null;
    }
  }

  /**
   * Process a single sync queue item
   */
  private async processQueueItem(item: SyncQueueItem, userId: string): Promise<boolean> {
    try {
      const payload = JSON.parse(item.payload);

      switch (item.action) {
        case 'create': {
          const { error } = await supabase
            .from('duas')
            .insert({
              id: payload.id,
              user_id: userId,
              title: payload.title,
              text: payload.text,
              is_favorite: payload.is_favorite,
              created_at: new Date(payload.created_at).toISOString(),
              updated_at: new Date(payload.updated_at).toISOString(),
            });

          if (error) {
            console.error(`[DuaSync] Create error for ${item.dua_id}:`, error);
            return false;
          }
          break;
        }

        case 'update': {
          const { error } = await supabase
            .from('duas')
            .update({
              title: payload.title,
              text: payload.text,
              is_favorite: payload.is_favorite,
              updated_at: new Date(payload.updated_at).toISOString(),
            })
            .eq('id', item.dua_id)
            .eq('user_id', userId);

          if (error) {
            console.error(`[DuaSync] Update error for ${item.dua_id}:`, error);
            return false;
          }
          break;
        }

        case 'delete': {
          const { error } = await supabase
            .from('duas')
            .delete()
            .eq('id', item.dua_id)
            .eq('user_id', userId);

          if (error) {
            console.error(`[DuaSync] Delete error for ${item.dua_id}:`, error);
            return false;
          }
          break;
        }

        default:
          console.error(`[DuaSync] Unknown action: ${item.action}`);
          return false;
      }

      // Success: remove from queue
      await duaRepo.removeSyncQueueItem(item.id);
      return true;
    } catch (error) {
      console.error(`[DuaSync] Error processing queue item ${item.id}:`, error);
      return false;
    }
  }

  /**
   * Sync pending changes from sync_queue to Supabase
   * 
   * Steps:
   * 1. Check internet connectivity
   * 2. Get authenticated user ID
   * 3. Fetch all sync_queue items (ordered by created_at)
   * 4. Process each item in order
   * 5. Stop on first failure
   * 6. Remove successfully synced items from queue
   */
  async syncPendingChanges(): Promise<SyncResult> {
    // Prevent concurrent syncs
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
      message: '',
    };

    try {
      // Step 1: Check internet connectivity
      const hasInternet = await this.isInternetAvailable();
      if (!hasInternet) {
        result.message = 'No internet connection';
        this.isSyncing = false;
        return result;
      }

      // Step 2: Get authenticated user ID
      const userId = await this.getUserId();
      if (!userId) {
        result.message = 'User not authenticated';
        this.isSyncing = false;
        return result;
      }

      // Step 3: Fetch all sync_queue items
      const queueItems = await duaRepo.getSyncQueueItems();
      if (queueItems.length === 0) {
        result.success = true;
        result.message = 'No pending changes to sync';
        this.isSyncing = false;
        return result;
      }

      // Step 4: Process each item in order
      for (const item of queueItems) {
        const success = await this.processQueueItem(item, userId);
        if (success) {
          result.syncedCount++;
        } else {
          // Stop on first failure
          result.errorCount++;
          result.message = `Failed to sync ${item.action} for dua ${item.dua_id}`;
          this.isSyncing = false;
          return result;
        }
      }

      // All items processed successfully
      result.success = true;
      result.message = `Successfully synced ${result.syncedCount} changes`;
    } catch (error) {
      console.error('[DuaSync] Sync exception:', error);
      result.success = false;
      result.errorCount = result.errorCount || 1;
      result.message = error instanceof Error ? error.message : 'Unknown error';
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
    queueLength: number;
    hasInternet: boolean;
    isAuthenticated: boolean;
  }> {
    const hasInternet = await this.isInternetAvailable();
    const userId = await this.getUserId();
    const queueItems = await duaRepo.getSyncQueueItems();

    return {
      isSyncing: this.isSyncing,
      queueLength: queueItems.length,
      hasInternet,
      isAuthenticated: !!userId,
    };
  }
}

// Singleton instance
export const duaSyncService = new DuaSyncService();
