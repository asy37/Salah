/**
 * Profile Sync Service
 * Handles synchronization between SQLite (local cache) and Supabase (users_profile).
 *
 * - Pull: Fetch profile from Supabase and write to SQLite (when online).
 * - Push: Send queued profile updates from SQLite to Supabase.
 * - Sync: Pull first, then push queue.
 */

import { supabase } from '@/lib/supabase/client';
import { profileRepo, type ProfileSyncQueueItem } from '@/lib/database/sqlite/profile/repository';
import { getMyProfile, updateMyProfile } from '@/lib/api/services/profile';
import type { UpdateUserProfileInput } from '@/lib/api/services/profile';
import NetInfo from '@react-native-community/netinfo';

interface SyncResult {
  success: boolean;
  pulled: boolean;
  pushed: boolean;
  message: string;
}

class ProfileSyncService {
  private isSyncing = false;

  private async isInternetAvailable(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return Boolean(state.isConnected && state.isInternetReachable);
    } catch (error) {
      console.error('[ProfileSync] Error checking network:', error);
      return false;
    }
  }

  private async getUserId(): Promise<string | null> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.user?.id ?? null;
    } catch (error) {
      console.error('[ProfileSync] Error getting user:', error);
      return null;
    }
  }

  /**
   * Pull profile from Supabase and write to SQLite cache.
   */
  async pullFromSupabase(): Promise<boolean> {
    const userId = await this.getUserId();
    if (!userId) return false;

    try {
      const profile = await getMyProfile();
      await profileRepo.upsertLocalProfile(userId, profile);
      return true;
    } catch (error) {
      console.error('[ProfileSync] Pull error:', error);
      return false;
    }
  }

  /**
   * Process one item from profile_sync_queue: call updateMyProfile, then remove from queue.
   */
  private async processQueueItem(item: ProfileSyncQueueItem): Promise<boolean> {
    try {
      const payload = JSON.parse(item.payload) as UpdateUserProfileInput;
      await updateMyProfile(payload);
      await profileRepo.removeProfileSyncQueueItem(item.id);
      return true;
    } catch (error) {
      console.error('[ProfileSync] Push error for queue item:', error);
      return false;
    }
  }

  /**
   * Push pending profile updates from queue to Supabase.
   */
  async pushQueueToSupabase(): Promise<boolean> {
    const item = await profileRepo.getProfileSyncQueueItem();
    if (!item) return true;

    return this.processQueueItem(item);
  }

  /**
   * Full sync: pull from Supabase into cache, then push queue to Supabase.
   */
  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        pulled: false,
        pushed: false,
        message: 'Sync already in progress',
      };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: false,
      pulled: false,
      pushed: false,
      message: '',
    };

    try {
      const hasInternet = await this.isInternetAvailable();
      if (!hasInternet) {
        result.message = 'No internet connection';
        this.isSyncing = false;
        return result;
      }

      const userId = await this.getUserId();
      if (!userId) {
        result.message = 'User not authenticated';
        this.isSyncing = false;
        return result;
      }

      result.pulled = await this.pullFromSupabase();
      result.pushed = await this.pushQueueToSupabase();
      result.success = true;
      if (result.pulled) result.message = 'Profile synced';
      else if (result.pushed) result.message = 'Queue pushed';
      else result.message = 'No changes';
    } catch (error) {
      console.error('[ProfileSync] Sync exception:', error);
      result.message = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      this.isSyncing = false;
    }

    return result;
  }
}

export const profileSyncService = new ProfileSyncService();
