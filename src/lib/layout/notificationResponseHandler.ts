/**
 * Bildirim tıklama / aksiyon işleyici.
 * Root layout'tan ayrı tutulur; router ve konum bilgisi dışarıdan verilir.
 */

import * as Notifications from "expo-notifications";
import type { Router } from "expo-router";
import { notificationService } from "@/lib/notifications/NotificationService";

export type NotificationHandlerParams = {
  router: Router;
  location: { latitude: number; longitude: number } | null;
  method: number | undefined;
};

export async function processNotificationResponse(
  response: Notifications.NotificationResponse,
  params: NotificationHandlerParams
): Promise<void> {
  const { router } = params;
  const actionIdentifier = response.actionIdentifier;
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;

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
