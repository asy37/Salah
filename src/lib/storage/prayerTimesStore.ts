// src/lib/stores/prayerTimesStore.ts
// Primary source of "today" data is SQLite (prayer_times_month_cache).
// Layout/reconnect set todayData + lastSyncedAt after fetch; initial load from SQLite in layout.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AladhanPrayerTimesResponse } from "../api/services/prayerTimes";

type PrayerTimesState = {
  /** Bugünün vakit verisi; layout/reconnect tarafından SQLite veya calendar fetch sonrası set edilir. */
  todayData: AladhanPrayerTimesResponse["data"] | null;
  /** Son başarılı ay sync zamanı (Date.now()); stale modal için. */
  lastSyncedAt: number | null;

  setTodayData: (data: AladhanPrayerTimesResponse["data"] | null, syncedAt?: number) => void;
  getTodayData: () => AladhanPrayerTimesResponse["data"] | null;
  /** Bugünün verisi yok veya son sync 7+ gün önceyse true. */
  isPrayerTimesStale: () => boolean;
  /** Son senkronizasyondan bu yana geçen gün sayısı. */
  getDaysSinceLastSync: () => number | null;
  clearCache: () => void;
};

export const usePrayerTimesStore = create<PrayerTimesState>()(
  persist(
    (set, get) => ({
      todayData: null,
      lastSyncedAt: null,

      setTodayData: (data, syncedAt) =>
        set({
          todayData: data,
          ...(syncedAt !== undefined && { lastSyncedAt: syncedAt }),
        }),

      getTodayData: () => get().todayData,

      isPrayerTimesStale: () => {
        const { todayData, lastSyncedAt } = get();
        if (!todayData) return true;
        if (lastSyncedAt == null) return true;
        const days = Math.floor((Date.now() - lastSyncedAt) / 86400000);
        return days >= 7;
      },

      getDaysSinceLastSync: () => {
        const last = get().lastSyncedAt;
        if (last == null) return null;
        return Math.floor((Date.now() - last) / 86400000);
      },

      clearCache: () => set({ todayData: null, lastSyncedAt: null }),
    }),
    {
      name: "prayer-times-cache",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        todayData: state.todayData,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
