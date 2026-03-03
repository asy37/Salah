/**
 * Prayer Times Refresh on Reconnect
 *
 * When internet becomes available, processes prayer_times_sync_queue (months
 * that changed while offline), then fetches current month calendar and updates
 * SQLite + notifications.
 */

import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { fetchPrayerTimesCalendar } from '@/lib/api/services/prayerTimes';
import type { PrayerTimesDayData } from '@/lib/api/services/prayerTimes';
import { queryClient } from '@/lib/query/queryClient';
import { queryKeys } from '@/lib/query/queryKeys';
import { getTodayDDMMYYYY } from '@/lib/services/dailyReset';
import {
  upsertMonth,
  getPrayerTimesSyncQueue,
  removeFromPrayerTimesSyncQueue,
} from '@/lib/database/sqlite/prayer-times/repository';
import { useLocationStore } from '@/lib/storage/locationStore';
import { useMethodStore } from '@/lib/storage/useMethodStore';
import { usePrayerTimesStore } from '@/lib/storage/prayerTimesStore';
import { notificationScheduler } from '@/lib/services/notificationScheduler';
import { notificationService } from '@/lib/notifications/NotificationService';

const REFRESH_COOLDOWN_MS = 60 * 1000;

async function refreshPrayerTimesAndSchedule(
  latitude: number,
  longitude: number,
  method: number
): Promise<void> {
  const today = getTodayDDMMYYYY();
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  try {
    const queue = await getPrayerTimesSyncQueue();
    for (const item of queue) {
      try {
        const cal = await fetchPrayerTimesCalendar({
          latitude: item.latitude,
          longitude: item.longitude,
          method: item.method,
          year: item.year,
          month: item.month,
        });
        await upsertMonth(
          item.year,
          item.month,
          item.latitude,
          item.longitude,
          item.method,
          cal.data
        );
        await removeFromPrayerTimesSyncQueue(item.id);
      } catch {
        // skip failed queue item
      }
    }

    const cal = await fetchPrayerTimesCalendar({
      latitude,
      longitude,
      method,
      year,
      month,
    });
    await upsertMonth(year, month, latitude, longitude, method, cal.data);

    const todayFromCal = cal.data.find((d) => d.date?.gregorian?.date === today);
    if (todayFromCal) {
      usePrayerTimesStore.getState().setTodayData(todayFromCal, Date.now());
    }

    const dayIndex = cal.data.findIndex((d) => d.date?.gregorian?.date === today);
    const weekData: PrayerTimesDayData[] =
      dayIndex >= 0
        ? cal.data.slice(dayIndex, dayIndex + 7).map((d) => ({
            date: d.date!.gregorian!.date,
            data: d,
          }))
        : [];

    if (weekData.length > 0) {
      queryClient.prefetchQuery({
        queryKey: queryKeys.prayerTimes.byLocation(
          latitude,
          longitude,
          today,
          method
        ),
        queryFn: () =>
          Promise.resolve({
            code: 200,
            status: 'OK' as const,
            data: weekData[0]!.data,
          }),
        staleTime: 24 * 60 * 60 * 1000,
      });
      await notificationScheduler.scheduleAllNotificationsFromWeek(weekData);
    }
    await notificationService.scheduleStalePrayerTimesReminder();
  } catch (error) {
    const isSimulated = (error as Error)?.message === 'Simulated offline for Expo testing';
    if (!isSimulated) {
      console.error('[PrayerTimesRefresh] Reconnect refresh failed:', error);
    }
  }
}

export function usePrayerTimesRefreshOnReconnect() {
  const lastRefreshRef = useRef<number>(0);
  const location = useLocationStore((s) => s.location);
  const method = useMethodStore((s) => s.method?.id) ?? 13;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!state.isConnected || !state.isInternetReachable) return;

      const now = Date.now();
      if (now - lastRefreshRef.current < REFRESH_COOLDOWN_MS) return;
      lastRefreshRef.current = now;

      const latitude = location?.latitude ?? 41.0082;
      const longitude = location?.longitude ?? 28.9784;

      refreshPrayerTimesAndSchedule(latitude, longitude, method).catch((error) => {
        const isSimulated = (error as Error)?.message === 'Simulated offline for Expo testing';
        if (!isSimulated) {
          console.error('[PrayerTimesRefresh] Reconnect refresh failed:', error);
        }
      });
    });

    return () => unsubscribe();
  }, [location?.latitude, location?.longitude, method]);
}
