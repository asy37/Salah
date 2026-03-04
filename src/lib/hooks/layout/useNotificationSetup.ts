/**
 * Bildirim izinleri, push token sync ve bildirim tıklama/aksiyon dinleyicileri.
 */

import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
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
    notificationService.requestPermissions().catch(() => {});
    syncPushTokenAndSettings().catch(() => {});

    const params: NotificationHandlerParams = {
      router,
      location: location ?? null,
      method,
    };

    const handleResponse = (response: Notifications.NotificationResponse) => {
      processNotificationResponse(response, params).catch(() => {});
    };

    Notifications.getLastNotificationResponseAsync()
      .then((last) => {
        if (last) handleResponse(last);
      })
      .catch(() => {});

    notificationListenerRef.current = Notifications.addNotificationReceivedListener(() => {});
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(handleResponse);

    return () => {
      notificationListenerRef.current?.remove();
      responseListenerRef.current?.remove();
    };
  }, [router, location?.latitude, location?.longitude, method]);
}
