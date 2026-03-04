/**
 * 7+ gündür senkronize olmamışsa stale prayer times modalını gösterir.
 */

import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { usePrayerTimesStore } from "@/lib/storage/prayerTimesStore";

export function useStalePrayerTimesModal(
  canAccessApp: boolean,
  segments: string[],
  isNavigationReady: boolean
): [boolean, () => void] {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!canAccessApp || segments[0] !== "(tabs)" || !isNavigationReady) return;

    const check = () => {
      if (usePrayerTimesStore.getState().isPrayerTimesStale()) {
        setShow(true);
      }
    };

    check();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => sub.remove();
  }, [canAccessApp, segments, isNavigationReady]);

  return [show, () => setShow(false)];
}
