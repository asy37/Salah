/**
 * Ezan vakitleri: SQLite cache'den bugünü yükle, takvimi çek, store + bildirimleri güncelle.
 */

import { useEffect, useRef } from "react";
import { fetchPrayerTimesCalendar } from "@/lib/api/services/prayerTimes";
import type { PrayerTimesDayData } from "@/lib/api/services/prayerTimes";
import { getTodayDDMMYYYY } from "@/lib/services/dailyReset";
import { getEffectiveToday } from "@/lib/services/prayerDate";
import {
  getDataByDate,
  getMonthSyncedAt,
  getPrayerTimesSyncQueue,
  removeFromPrayerTimesSyncQueue,
  addToPrayerTimesSyncQueue,
  upsertMonth,
} from "@/lib/database/sqlite/prayer-times/repository";
import { usePrayerTimesStore } from "@/lib/storage/prayerTimesStore";
import { useLocationStore } from "@/lib/storage/locationStore";
import { useMethodStore } from "@/lib/storage/useMethodStore";
import { queryClient } from "@/lib/query/queryClient";
import { queryKeys } from "@/lib/query/queryKeys";
import { notificationScheduler } from "@/lib/services/notificationScheduler";
import { notificationService } from "@/lib/notifications/NotificationService";
import { useNotificationSettings } from "@/lib/storage/notificationSettings";

const SCHEDULE_DEBOUNCE_MS = 2500;
const DEFAULT_LAT = 41.0082;
const DEFAULT_LNG = 28.9784;

export function usePrayerTimesPrefetch(dbReady: boolean): void {
  const location = useLocationStore((s) => s.location);
  const method = useMethodStore((s) => s.method?.id);
  const notificationSettings = useNotificationSettings();
  const lastRunRef = useRef(0);

  useEffect(() => {
    if (!method || !dbReady) return;
    const latitude = location?.latitude ?? DEFAULT_LAT;
    const longitude = location?.longitude ?? DEFAULT_LNG;
    const today = getTodayDDMMYYYY();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const run = async () => {
      const t = Date.now();
      if (t - lastRunRef.current < SCHEDULE_DEBOUNCE_MS) return;
      lastRunRef.current = t;
      try {
        const cached = await getDataByDate(today, latitude, longitude, method);
        if (cached) {
          const syncedAt = await getMonthSyncedAt(year, month, latitude, longitude, method);
          usePrayerTimesStore.getState().setTodayData(cached, syncedAt ?? undefined);
          queryClient.invalidateQueries({
            queryKey: ["prayerTracking", "local", getEffectiveToday()],
          });
        }

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
            /* skip failed queue item */
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
          queryClient.invalidateQueries({
            queryKey: ["prayerTracking", "local", getEffectiveToday()],
          });
        }

        const dayIndex = cal.data.findIndex((d) => d.date?.gregorian?.date === today);
        const weekData: PrayerTimesDayData[] =
          dayIndex >= 0
            ? cal.data.slice(dayIndex, dayIndex + 7).map((d) => ({
                date: d.date?.gregorian?.date ?? "",
                data: d,
              }))
            : [];

        if (weekData.length > 0) {
          const firstDay = weekData[0];
          if (firstDay) {
            queryClient.prefetchQuery({
              queryKey: queryKeys.prayerTimes.byLocation(latitude, longitude, today, method),
              queryFn: () =>
                Promise.resolve({
                  code: 200,
                  status: "OK" as const,
                  data: firstDay.data,
                }),
              staleTime: 24 * 60 * 60 * 1000,
            });
          }
          await notificationScheduler.scheduleAllNotificationsFromWeek(weekData);
        }
        await notificationService.scheduleStalePrayerTimesReminder();
      } catch (error) {
        const isSimulated =
          (error as Error)?.message === "Simulated offline for Expo testing";
        if (!isSimulated) {
          console.error("[Layout] Failed to fetch prayer times calendar:", error);
        }
        try {
          await addToPrayerTimesSyncQueue(year, month, latitude, longitude, method);
        } catch {
          /* ignore */
        }
      }
    };

    run();
  }, [location, method, dbReady, notificationSettings]);
}
