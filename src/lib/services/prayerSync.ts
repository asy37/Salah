/**
 * Prayer Sync Service
 * Handles synchronization between SQLite (local) and Supabase (cloud)
 * 
 * Architecture:
 * - Daily state is stored in SQLite (offline-first)
 * - Sync queue stores data waiting to be synced
 * - Supabase receives only boolean payloads (prayed/not prayed)
 */

import { supabase } from '@/lib/supabase/client';
import { prayerTrackingRepo, type SyncQueueItem } from '@/lib/database/sqlite/prayer-tracking/repository';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}

class PrayerSyncService {
  private isSyncing = false;

  /**
   * Check if device is online
   * Uses fetch to check connectivity (works without NetInfo package)
   */
  async isOnline(): Promise<boolean> {
    try {
      // Simple connectivity check
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
   * Sync all pending queue items to Supabase
   */
  async syncPendingItems(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: ['Sync already in progress'],
      };
    }

    // Check internet connection
    const online = await this.isOnline();
    if (!online) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: ['No internet connection'],
      };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      // Get all pending items
      const pendingItems = await prayerTrackingRepo.getPendingQueueItems();

      if (pendingItems.length === 0) {
        this.isSyncing = false;
        return result;
      }

      // Sync each item
      for (const item of pendingItems) {
        try {
          const success = await this.syncSingleItem(item);
          if (success) {
            // Delete item after successful sync
            await prayerTrackingRepo.deleteQueueItem(item.id);
            result.syncedCount++;
          } else {
            result.failedCount++;
            result.errors.push(`Failed to sync ${item.date}`);
          }
        } catch (error) {
          result.failedCount++;
          result.errors.push(
            `Error syncing ${item.date}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      result.success = result.failedCount === 0;
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Sync a single queue item to Supabase
   */
  private async syncSingleItem(item: SyncQueueItem): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('sync_prayer_log', {
        p_date: item.date,
        p_fajr: item.payload.fajr,
        p_dhuhr: item.payload.dhuhr,
        p_asr: item.payload.asr,
        p_maghrib: item.payload.maghrib,
        p_isha: item.payload.isha,
      } as any);

      if (error) {
        console.error('[PrayerSync] Sync error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[PrayerSync] Sync exception:', error);
      return false;
    }
  }

  /**
   * Start periodic sync (every 30 minutes)
   */
  startPeriodicSync(intervalMinutes: number = 30): () => void {
    const interval = setInterval(() => {
      this.syncPendingItems().catch((error) => {
        console.error('[PrayerSync] Periodic sync error:', error);
      });
    }, intervalMinutes * 60 * 1000);

    // Return cleanup function
    return () => clearInterval(interval);
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    pendingCount: number;
    isSyncing: boolean;
  }> {
    const pendingItems = await prayerTrackingRepo.getPendingQueueItems();
    return {
      pendingCount: pendingItems.length,
      isSyncing: this.isSyncing,
    };
  }
}

// Singleton instance
export const prayerSyncService = new PrayerSyncService();

