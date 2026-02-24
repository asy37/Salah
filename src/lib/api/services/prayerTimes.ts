/**
 * Prayer Times API Service
 * Handles fetching prayer times from Aladhan API
 */

import { aladhanClient } from "../client";
import { usePrayerTimesStore } from "@/lib/storage/prayerTimesStore";
import { storage } from "@/lib/storage/mmkv";

export interface AladhanPrayerTimesResponse {
  code: number;
  status: string;
  data: {
    timings: {
      Fajr: string;
      Sunrise: string;
      Dhuhr: string;
      Asr: string;
      Sunset: string;
      Maghrib: string;
      Isha: string;
      Imsak: string;
      Midnight: string;
      Firstthird: string;
      Lastthird: string;
    };
    date: {
      readable: string;
      timestamp: string;
      hijri: {
        date: string;
        format: string;
        day: string;
        weekday: {
          en: string;
          ar: string;
        };
        month: {
          number: number;
          en: string;
          ar: string;
          days: number;
        };
        year: string;
        designation: {
          abbreviated: string;
          expanded: string;
        };
        holidays: string[];
        adjustedHolidays: string[];
        method: string;
      };
      gregorian: {
        date: string;
        format: string;
        day: string;
        weekday: {
          en: string;
        };
        month: {
          number: number;
          en: string;
        };
        year: string;
        designation: {
          abbreviated: string;
          expanded: string;
        };
        lunarSighting: boolean;
      };
    };
    meta: {
      latitude: number;
      longitude: number;
      timezone: string;
      method: {
        id: number;
        name: string;
        params: {
          Fajr: number;
          Isha: number;
        };
        location: {
          latitude: number;
          longitude: number;
        };
      };
      latitudeAdjustmentMethod: string;
      midnightMode: string;
      school: string;
      offset: {
        Imsak: number;
        Fajr: number;
        Sunrise: number;
        Dhuhr: number;
        Asr: number;
        Sunset: number;
        Maghrib: number;
        Isha: number;
        Midnight: number;
      };
    };
  };
}

export interface PrayerTimesParams {
  latitude: number;
  longitude: number;
  method?: number; // Prayer calculation method (default: 2 = ISNA)
  calendarMethod?: string; // Calendar method (default: "ISNA")
  date?: string; // DD-MM-YYYY format
  timezone?: string;
}

/**
 * Fetch prayer times from Aladhan API
 */
export async function fetchPrayerTimes(
  params: PrayerTimesParams
): Promise<AladhanPrayerTimesResponse> {
  const {
    latitude,
    longitude,
    method = 13,
    calendarMethod = "DIYANET",
    date,
    timezone,
  } = params;

  const cacheKey = `${date}_${latitude}_${longitude}_${method}`;
  const cache = usePrayerTimesStore.getState().cache;

  if (cache?.key === cacheKey) {
    return {
      code: 200,
      status: "OK",
      data: cache.data,
    };
  }

  try {
    // Expo'da gerçek ağ kapatılamadığı için: __DEV__ iken "simüle offline" ile test
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      const simulateOffline = await storage.getBoolean("simulatePrayerTimesOffline");
      if (simulateOffline) {
        throw new Error("Simulated offline for Expo testing");
      }
    }
    const response = await aladhanClient.get<AladhanPrayerTimesResponse>(
      "/timings",
      {
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        method: method.toString(),
        calendarMethod: calendarMethod,
        ...(date && { date }),
        ...(timezone && { timezone }),
      }
    );

    if (response.code !== 200) {
      throw new Error(response.status || "Failed to fetch prayer times");
    }

    usePrayerTimesStore.getState().setCache({
      key: cacheKey,
      data: response.data,
      cachedAt: Date.now(),
    });

    return response;
  } catch (error) {
    const isSimulatedOffline = (error as Error)?.message === "Simulated offline for Expo testing";
    if (!isSimulatedOffline) {
      console.error("❌ Aladhan API hatası:", error);
    }
    // Offline-first: Ağ hatası olsa bile önceden cache varsa onu döndür; store'u da güncelle ki ekranlar (store'dan okuyan) veriyi görsün.
    let fallbackCache = usePrayerTimesStore.getState().cache;
    if (fallbackCache?.data) {
      usePrayerTimesStore.getState().setCache(fallbackCache);
      return {
        code: 200,
        status: "OK",
        data: fallbackCache.data,
      };
    }
    // Simüle offline: Store rehydration async olduğu için cache bazen hep null kalıyor. Persist'ın yazdığı AsyncStorage'dan doğrudan oku.
    if (typeof __DEV__ !== "undefined" && __DEV__ && isSimulatedOffline) {
      try {
        const raw = await storage.getString("prayer-times-cache");
        if (raw) {
          const parsed = JSON.parse(raw) as { state?: { cache?: typeof fallbackCache }; cache?: typeof fallbackCache };
          const fromStorage = parsed?.state?.cache ?? parsed?.cache ?? null;
          if (fromStorage?.data) {
            usePrayerTimesStore.getState().setCache(fromStorage);
            return {
              code: 200,
              status: "OK",
              data: fromStorage.data,
            };
          }
        }
      } catch {
        // ignore parse/storage errors
      }
    }
    throw error;
  }
}
