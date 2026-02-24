/**
 * Profile Sync Hook
 *
 * Triggers sync when:
 * - App comes to foreground
 * - User logs in
 * - Internet connectivity is restored
 *
 * After sync, invalidates profile query so UI reads fresh data from SQLite.
 */

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { profileSyncService } from '@/lib/services/profileSyncService';
import { useAuth } from '@/lib/hooks/auth/useAuth';
import NetInfo from '@react-native-community/netinfo';
import { queryClient } from '@/lib/query/queryClient';
import { queryKeys } from '@/lib/query/queryKeys';

const SYNC_COOLDOWN_MS = 60 * 1000;

function runProfileSync() {
  profileSyncService.sync().then((result) => {
    if (result.success || result.pulled || result.pushed) {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
    }
  }).catch((error) => {
    console.error('[ProfileSync] Sync error:', error);
  });
}

export function useProfileSync() {
  const { user, session } = useAuth();
  const lastSyncAttemptRef = useRef<number>(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const now = Date.now();
        if (now - lastSyncAttemptRef.current < SYNC_COOLDOWN_MS) return;
        lastSyncAttemptRef.current = now;
        runProfileSync();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (user && session) {
      const now = Date.now();
      if (now - lastSyncAttemptRef.current < SYNC_COOLDOWN_MS) return;
      lastSyncAttemptRef.current = now;
      runProfileSync();
    }
  }, [user, session]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        const now = Date.now();
        if (now - lastSyncAttemptRef.current < SYNC_COOLDOWN_MS) return;
        lastSyncAttemptRef.current = now;
        runProfileSync();
      }
    });
    return () => unsubscribe();
  }, []);
}
