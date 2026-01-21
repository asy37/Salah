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
      // Refresh sync status
      queryClient.invalidateQueries({
        queryKey: ['prayerSync', 'status'],
      });
    },
  });
}

/**
 * Hook to setup automatic sync on app state changes
 */
export function useAutoSync() {
  const { mutate: sync } = useSyncPrayers();

  useEffect(() => {
    // Sync when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        sync();
      }
    });

    // Start periodic sync
    const cleanup = prayerSyncService.startPeriodicSync(30);

    return () => {
      subscription.remove();
      cleanup();
    };
  }, [sync]);
}

