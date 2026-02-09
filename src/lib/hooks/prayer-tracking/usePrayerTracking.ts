/**
 * Prayer Tracking Hooks
 * TanStack Query hooks for prayer tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import {
  getTodayPrayerLog,
  updatePrayerStatus,
  getPrayerStreak,
} from '@/lib/api/services/prayerTracking';
import type {
  PrayerTrackingData,
  PrayerStreak,
  UpdatePrayerStatusRequest,
  PrayerName,
} from '@/types/prayer-tracking';
import { useAuth } from '@/lib/hooks/auth/useAuth';

/**
 * Hook: Get today's prayer tracking data
 */
export function usePrayerTracking() {
  const { session } = useAuth();

  return useQuery<PrayerTrackingData>({
    queryKey: queryKeys.prayerTracking.today(),
    queryFn: getTodayPrayerLog,
    enabled: !!session,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook: Update prayer status
 */
export function useUpdatePrayerStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdatePrayerStatusRequest) =>
      updatePrayerStatus(request),
    onSuccess: () => {
      // Invalidate and refetch today's prayer log
      queryClient.invalidateQueries({
        queryKey: queryKeys.prayerTracking.today(),
      });
      // Also invalidate streak
      queryClient.invalidateQueries({
        queryKey: ['prayerStreak'],
      });
    },
  });
}

/**
 * Hook: Get prayer streak
 */
export function usePrayerStreak() {
  const { session } = useAuth();

  return useQuery<PrayerStreak>({
    queryKey: ['prayerStreak'],
    queryFn: getPrayerStreak,
    enabled: !!session,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Mark prayer as completed
 */
export function useMarkPrayerCompleted() {
  const mutation = useUpdatePrayerStatus();
  return {
    ...mutation,
    mutateAsync: ({
      prayerName,
      prayerTime,
    }: {
      prayerName: PrayerName;
      prayerTime: string;
    }) => mutation.mutateAsync({ prayer: prayerName, status: 'prayed' }),
  };
}

/**
 * Set remind later for prayer
 */
export function useSetRemindLater() {
  const mutation = useUpdatePrayerStatus();
  return {
    ...mutation,
    mutateAsync: (prayerName: PrayerName) =>
      mutation.mutateAsync({ prayer: prayerName, status: 'later' }),
  };
}

