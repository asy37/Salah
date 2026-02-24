/**
 * Prayer Tracking Hooks
 * TanStack Query hooks for prayer tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import {
  getTodayPrayerLog,
  updatePrayerStatus,
} from '@/lib/api/services/prayerTracking';
import type {
  PrayerTrackingData,
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.prayerTracking.today(),
      });
    },
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

