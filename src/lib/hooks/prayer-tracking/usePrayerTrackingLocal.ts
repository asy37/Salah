/**
 * Local-First Prayer Tracking Hooks
 * Uses SQLite as source of truth for daily state.
 * Daily reset uses imsak time when prayer times are available (reset after imsak, not at midnight).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prayerTrackingRepo } from '@/lib/database/sqlite/prayer-tracking/repository';
import { dailyResetService } from '@/lib/services/dailyReset';
import { getEffectiveToday } from '@/lib/services/prayerDate';
import { usePrayerTimesStore } from '@/lib/storage/prayerTimesStore';
import { notificationService } from '@/lib/notifications/NotificationService';
import type { PrayerStatus, PrayerName, PrayerStreak } from '@/types/prayer-tracking';

/**
 * Get today's prayer state from SQLite.
 * When prayer times cache is available, daily reset runs after imsak (not at midnight).
 */
export function usePrayerTrackingLocal() {
  const effectiveToday = getEffectiveToday();

  return useQuery({
    queryKey: ['prayerTracking', 'local', effectiveToday],
    queryFn: async () => {
      const today = getEffectiveToday();
      const todayData = usePrayerTimesStore.getState().getTodayData();
      const prayerTimesResponse =
        todayData == null
          ? undefined
          : ({ data: todayData } as Parameters<typeof dailyResetService.initialize>[0]);
      await dailyResetService.initialize(prayerTimesResponse);

      const state = await prayerTrackingRepo.getCurrentPrayerState();

      if (!state) {
        await prayerTrackingRepo.upsertPrayerState(today, 'fajr', 'upcoming');
        const newState = await prayerTrackingRepo.getCurrentPrayerState();
        if (!newState) {
          throw new Error('Failed to create daily prayer state');
        }
        return newState;
      }

      if (state.date !== today) {
        await prayerTrackingRepo.upsertPrayerState(today, 'fajr', state.fajr);
        const updatedState = await prayerTrackingRepo.getCurrentPrayerState();
        if (updatedState) return updatedState;
      }

      return state;
    },
    staleTime: 0, // Always fresh (local data)
  });
}

/**
 * Get prayer streak from local SQLite (today + sync queue).
 * Use this for UI so streak reflects local state; Supabase streak has no row for today until next day.
 */
export function usePrayerStreakLocal() {
  const effectiveToday = getEffectiveToday();

  return useQuery<PrayerStreak>({
    queryKey: ['prayerTracking', 'localStreak', effectiveToday],
    queryFn: async () => {
      const count = await prayerTrackingRepo.calculateLocalStreak();
      return { count };
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Update prayer status (local only)
 * 
 * IMPORTANT: This only updates local SQLite state.
 * Sync to Supabase happens:
 * 1. At imsak time (daily reset) - previous day's data is added to sync queue
 * 2. Auto sync processes the queue periodically or on app state change
 */
export function useUpdatePrayerStatusLocal() {
  const queryClient = useQueryClient();
  const effectiveToday = getEffectiveToday();

  return useMutation({
    mutationFn: async ({
      prayer,
      status,
    }: {
      prayer: PrayerName;
      status: PrayerStatus;
    }) => {
      const today = getEffectiveToday();
      await prayerTrackingRepo.upsertPrayerState(today, prayer, status);

      // Sync queue is handled by daily reset service at imsak time
      // Previous day's state is automatically queued for sync
    },
    onSuccess: (_, { prayer, status }) => {
      queryClient.invalidateQueries({
        queryKey: ['prayerTracking', 'local', effectiveToday],
      });
      queryClient.invalidateQueries({
        queryKey: ['prayerTracking', 'localStreak', effectiveToday],
      });
      queryClient.invalidateQueries({
        queryKey: ['prayerStreak'],
      });
      if (status === 'prayed') {
        notificationService.cancelPrayerReminderForPrayer(prayer, effectiveToday).catch(() => {});
      }
    },
  });
}

/**
 * Calculate progress from local state
 */
export function calculateProgress(state: {
  fajr: PrayerStatus;
  dhuhr: PrayerStatus;
  asr: PrayerStatus;
  maghrib: PrayerStatus;
  isha: PrayerStatus;
}): number {
  const prayers = [state.fajr, state.dhuhr, state.asr, state.maghrib, state.isha];
  const prayedCount = prayers.filter((p) => p === 'prayed').length;
  return Math.round((prayedCount / 5) * 100);
}

/**
 * Convert local state to PrayerTrackingData format
 */
export function convertToPrayerTrackingData(state: {
  fajr: PrayerStatus;
  dhuhr: PrayerStatus;
  asr: PrayerStatus;
  maghrib: PrayerStatus;
  isha: PrayerStatus;
}): import('@/types/prayer-tracking').PrayerTrackingData {
  return {
    prayers: {
      fajr: state.fajr,
      dhuhr: state.dhuhr,
      asr: state.asr,
      maghrib: state.maghrib,
      isha: state.isha,
    },
    percent: calculateProgress(state),
  };
}

