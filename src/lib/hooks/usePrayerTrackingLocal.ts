/**
 * Local-First Prayer Tracking Hooks
 * Uses SQLite as source of truth for daily state
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prayerTrackingRepo } from '@/lib/database/sqlite/prayer-tracking/repository';
import { dailyResetService, getTodayDateString } from '@/lib/services/dailyReset';
import type { PrayerStatus, PrayerName } from '@/types/prayer-tracking';

/**
 * Get today's prayer state from SQLite
 */
export function usePrayerTrackingLocal() {
  const today = getTodayDateString();

  return useQuery({
    queryKey: ['prayerTracking', 'local', today],
    queryFn: async () => {
      // Initialize daily reset if needed
      await dailyResetService.initialize();

      // Get current state (single row)
      const state = await prayerTrackingRepo.getCurrentPrayerState();

      // If no state exists, create default
      if (!state) {
        // Initialize with defaults
        await prayerTrackingRepo.upsertPrayerState(today, 'fajr', 'upcoming');
        const newState = await prayerTrackingRepo.getCurrentPrayerState();
        if (!newState) {
          throw new Error('Failed to create daily prayer state');
        }
        return newState;
      }

      // If date changed, update date (but keep state)
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
 * Update prayer status (local only)
 * 
 * IMPORTANT: This only updates local SQLite state.
 * Sync to Supabase happens:
 * 1. At imsak time (daily reset) - previous day's data is added to sync queue
 * 2. Auto sync processes the queue periodically or on app state change
 */
export function useUpdatePrayerStatusLocal() {
  const queryClient = useQueryClient();
  const today = getTodayDateString();

  return useMutation({
    mutationFn: async ({
      prayer,
      status,
    }: {
      prayer: PrayerName;
      status: PrayerStatus;
    }) => {
      // Update local state only (offline-first)
      await prayerTrackingRepo.upsertPrayerState(today, prayer, status);
      
      // Sync queue is handled by daily reset service at imsak time
      // Previous day's state is automatically queued for sync
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ['prayerTracking', 'local', today],
      });
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

