/**
 * Bildirim tıklama / aksiyon işleyici.
 * Root layout'tan ayrı tutulur; router ve konum bilgisi dışarıdan verilir.
 */

import * as Notifications from "expo-notifications";
import type { Router } from "expo-router";
import type { PrayerName } from "@/types/prayer-tracking";
import { queryClient } from "@/lib/query/queryClient";
import { getTodayDDMMYYYY } from "@/lib/services/dailyReset";
import { fetchPrayerTimes } from "@/lib/api/services/prayerTimes";
import { notificationService, NOTIFICATION_ACTIONS } from "@/lib/notifications/NotificationService";
import { notificationScheduler } from "@/lib/services/notificationScheduler";

export type NotificationHandlerParams = {
  router: Router;
  location: { latitude: number; longitude: number } | null;
  method: number | undefined;
};

export async function processNotificationResponse(
  response: Notifications.NotificationResponse,
  params: NotificationHandlerParams
): Promise<void> {
  const { router, location, method } = params;
  const actionIdentifier = response.actionIdentifier;
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;

  if (actionIdentifier === NOTIFICATION_ACTIONS.PRAYER_MARKED_PRAYED) {
    const { prayerTrackingRepo } = await import("@/lib/database/sqlite/prayer-tracking/repository");
    const { getTodayDateString } = await import("@/lib/services/dailyReset");

    if (data?.prayerName && typeof data.prayerName === "string") {
      const prayerName = data.prayerName.toLowerCase();
      const today = getTodayDateString();
      const notifDate = typeof data?.date === "string" ? data.date : today;
      await prayerTrackingRepo.upsertPrayerState(today, prayerName as PrayerName, "prayed");

      await notificationService.cancelPrayerReminderForPrayer(data.prayerName, notifDate);
      await notificationService.cancelPrayerLateReminderForPrayer(data.prayerName, notifDate);

      queryClient.invalidateQueries({
        queryKey: ["prayerTracking", "local", today],
      });
    }
    return;
  }

  if (actionIdentifier === NOTIFICATION_ACTIONS.PRAYER_REMIND_LATER) {
    if (data?.prayerName && typeof data.prayerName === "string") {
      const latitude = location?.latitude ?? 41.0082;
      const longitude = location?.longitude ?? 28.9784;
      try {
        const prayerTimesResponse = await fetchPrayerTimes({
          latitude,
          longitude,
          method: method ?? 13,
          date: getTodayDDMMYYYY(),
        });
        await notificationScheduler.scheduleReminderForNextPrayer(
          data.prayerName,
          prayerTimesResponse
        );
      } catch (error) {
        console.error("[Notification] Failed to schedule reminder:", error);
      }
    }
    return;
  }

  if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    const deepLink = typeof data?.deepLink === "string" ? data.deepLink : "";
    if (deepLink) {
      if (deepLink.includes("daily-verse")) {
        router.push("/(tabs)/more/daily-verse");
      } else if (deepLink.includes("adhan")) {
        router.push("/(tabs)/adhan");
      } else if (deepLink.includes("tracking") || deepLink.includes("index")) {
        router.push("/(tabs)");
      }
    } else if (data?.type === "prayer_time") {
      router.push("/(tabs)/adhan");
    } else if (data?.type === "streak") {
      router.push("/(tabs)");
    } else if (data?.type === "daily_verse") {
      router.push("/(tabs)/more/daily-verse");
    } else if (
      data?.type === "pre_prayer" ||
      data?.type === "prayer_reminder" ||
      data?.type === "prayer_status" ||
      data?.type === "prayer_late_reminder"
    ) {
      router.push("/(tabs)");
    } else if (data?.type === "stale_prayer_times_reminder") {
      router.push("/(tabs)/adhan");
    }
  }

  await notificationService.handleNotificationResponse(response);
}
