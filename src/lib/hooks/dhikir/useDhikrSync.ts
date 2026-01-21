/**
 * Dhikr Sync Hook
 * 
 * Triggers sync when:
 * - App comes to foreground
 * - User logs in
 * - 24h passed since last sync
 * 
 * Never blocks UI, fails silently
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { dhikrSyncService } from '@/lib/services/dhikrSyncService';
import { useAuth } from '../auth/useAuth';

/**
 * Hook to setup automatic dhikr sync
 * 
 * Syncs when:
 * - App comes to foreground
 * - User logs in (SIGNED_IN event)
 * - Max once every 24 hours
 */
export function useDhikrSync() {
  const { user, session } = useAuth();
  const lastSyncAttemptRef = useRef<number>(0);
  const SYNC_COOLDOWN_MS = 60 * 1000; // Don't sync more than once per minute

  // Sync on app foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const now = Date.now();
        // Throttle: don't sync more than once per minute
        if (now - lastSyncAttemptRef.current < SYNC_COOLDOWN_MS) {
          return;
        }

        lastSyncAttemptRef.current = now;
        // Fire and forget - don't await, don't block
        dhikrSyncService.syncDhikrsIfNeeded().catch((error) => {
          console.error('[DhikrSync] Foreground sync error:', error);
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Sync on login
  useEffect(() => {
    if (user && session) {
      // User just logged in - sync dirty records
      const now = Date.now();
      if (now - lastSyncAttemptRef.current < SYNC_COOLDOWN_MS) {
        return;
      }

      lastSyncAttemptRef.current = now;
      // Fire and forget - don't await, don't block
      dhikrSyncService.syncDhikrsIfNeeded().catch((error) => {
        console.error('[DhikrSync] Login sync error:', error);
      });
    }
  }, [user, session]);
}
