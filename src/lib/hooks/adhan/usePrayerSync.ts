/**
 * Prayer Sync Hooks
 * Handles synchronization between local SQLite and Supabase
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prayerSyncService } from '@/lib/services/prayerSync';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Get sync status (pending count, is syncing)
 */
export function usePrayerSyncStatus() {
  return useQuery({
    queryKey: ['prayerSync', 'status'],
    queryFn: () => prayerSyncService.getSyncStatus(),
    refetchInterval: 30000, // Check every 30 seconds
  });
}

/**
 * Manual sync trigger
 */
export function useSyncPrayers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => prayerSyncService.syncPendingItems(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['prayerSync', 'status'],
      });
      queryClient.invalidateQueries({
        queryKey: ['prayerStreak'],
      });
    },
  });
}

/**
 * Hook to setup automatic sync on app state changes
 */
export function useAutoSync() {
  const queryClient = useQueryClient();
  const { mutate: sync } = useSyncPrayers();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        sync();
        queryClient.invalidateQueries({ queryKey: ['prayerStreak'] });
      }
    });

    const cleanup = prayerSyncService.startPeriodicSync(30);

    return () => {
      subscription.remove();
      cleanup();
    };
  }, [sync, queryClient]);
}

