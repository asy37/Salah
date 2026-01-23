/**
 * Dua Sync Hook
 * 
 * Triggers sync when:
 * - App comes to foreground
 * - User logs in
 * - Internet connectivity is restored
 * 
 * Never blocks UI, fails silently
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { duaSyncService } from '@/lib/services/duaSyncService';
import { useAuth } from '@/lib/hooks/auth/useAuth';
import NetInfo from '@react-native-community/netinfo';

/**
 * Hook to setup automatic dua sync
 * 
 * Syncs when:
 * - App comes to foreground
 * - User logs in (SIGNED_IN event)
 * - Internet connectivity is restored
 */
export function useDuaSync() {
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
        duaSyncService.syncPendingChanges().catch((error) => {
          console.error('[DuaSync] Foreground sync error:', error);
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
      // User just logged in - sync pending changes
      const now = Date.now();
      if (now - lastSyncAttemptRef.current < SYNC_COOLDOWN_MS) {
        return;
      }

      lastSyncAttemptRef.current = now;
      // Fire and forget - don't await, don't block
      duaSyncService.syncPendingChanges().catch((error) => {
        console.error('[DuaSync] Login sync error:', error);
      });
    }
  }, [user, session]);

  // Sync when internet connectivity is restored
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        const now = Date.now();
        if (now - lastSyncAttemptRef.current < SYNC_COOLDOWN_MS) {
          return;
        }

        lastSyncAttemptRef.current = now;
        // Fire and forget - don't await, don't block
        duaSyncService.syncPendingChanges().catch((error) => {
          console.error('[DuaSync] Connectivity restored sync error:', error);
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);
}
