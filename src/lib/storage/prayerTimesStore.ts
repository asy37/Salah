// src/lib/stores/prayerTimesStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AladhanPrayerTimesResponse } from "../api/services/prayerTimes";

type PrayerTimesCache = {
  key: string;
  data: AladhanPrayerTimesResponse["data"];
  cachedAt: number; // Date.now()
};

type PrayerTimesState = {
  cache: PrayerTimesCache | null;

  setCache: (cache: PrayerTimesCache) => void;
  clearCache: () => void;
};

export const usePrayerTimesStore = create<PrayerTimesState>()(
  persist(
    (set) => ({
      cache: null,

      setCache: (cache) => set({ cache }),
      clearCache: () => set({ cache: null }),
    }),
    {
      name: "prayer-times-cache",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);