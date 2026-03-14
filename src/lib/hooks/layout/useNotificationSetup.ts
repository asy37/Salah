/**
 * Bildirim izinleri, push token sync ve bildirim tıklama/aksiyon dinleyicileri.
 * expo-notifications Expo Go'da (SDK 53+) yok; modül effect içinde lazy yüklenir, yoksa no-op.
 */

import { useEffect, useRef } from "react";
import type { Router } from "expo-router";
import { notificationService } from "@/lib/notifications/NotificationService";
import { syncPushTokenAndSettings } from "@/lib/services/pushTokenSync";
import { processNotificationResponse, type NotificationHandlerParams } from "@/lib/layout/notificationResponseHandler";
import { useLocationStore } from "@/lib/storage/locationStore";
import { useMethodStore } from "@/lib/storage/useMethodStore";

export function useNotificationSetup(router: Router): void {
  const location = useLocationStore((s) => s.location);
  const method = useMethodStore((s) => s.method?.id);
  const notificationListenerRef = useRef<{ remove: () => void } | null>(null);
  const responseListenerRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      let Notifications: typeof import("expo-notifications");
      try {
        Notifications = await import("expo-notifications");
      } catch {
        return;
      }

      if (cancelled) return;
      notificationService.requestPermissions().catch(() => {});
      syncPushTokenAndSettings().catch(() => {});

      const params: NotificationHandlerParams = {
        router,
        location: location ?? null,
        method,
      };

      const handleResponse = (response: import("expo-notifications").NotificationResponse) => {
        processNotificationResponse(response, params).catch(() => {});
      };

      const last = Notifications.getLastNotificationResponse();
      if (last && !cancelled) handleResponse(last);

      if (cancelled) return;
      notificationListenerRef.current = Notifications.addNotificationReceivedListener(() => {});
      responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(handleResponse);
    };

    setup();

    return () => {
      cancelled = true;
      notificationListenerRef.current?.remove();
      responseListenerRef.current?.remove();
    };
  }, [router, location?.latitude, location?.longitude, method]);
}
