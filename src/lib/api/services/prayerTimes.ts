/**
 * Prayer Times API Service
 * Handles fetching prayer times from Aladhan API.
 * Primary flow: /calendar (monthly) → SQLite. Legacy: /timings (single day / week) for fallback.
 */

import { aladhanClient } from "../client";
import { usePrayerTimesStore } from "@/lib/storage/prayerTimesStore";
import { storage } from "@/lib/storage/mmkv";
import { getTodayDDMMYYYY, getDateDDMMYYYY } from "@/lib/services/dailyReset";
import { getEffectiveToday } from "@/lib/services/prayerDate";
import { queryClient } from "@/lib/query/queryClient";

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
 * Fetch prayer times for a single day (legacy /timings). Prefer calendar + SQLite flow.
 * Uses store todayData when requesting today; fallback from store on offline.
 */
export async function fetchPrayerTimes(
  params: PrayerTimesParams
): Promise<AladhanPrayerTimesResponse> {
  const {
    latitude,
    longitude,
    method = 13,
    calendarMethod = "DIYANET",
    date: paramDate,
    timezone,
  } = params;

  const date = paramDate ?? getTodayDDMMYYYY();
  const today = getTodayDDMMYYYY();
  const storeData = usePrayerTimesStore.getState().getTodayData();
  if (date === today && storeData?.date?.gregorian) {
    const g = storeData.date.gregorian;
    const cacheDate = `${String(g.day).padStart(2, "0")}-${String(g.month?.number ?? 0).padStart(2, "0")}-${g.year}`;
    if (cacheDate === today) {
      return { code: 200, status: "OK", data: storeData };
    }
  }

  try {
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
        date,
        ...(timezone && { timezone }),
      }
    );

    if (response.code !== 200) {
      throw new Error(response.status || "Failed to fetch prayer times");
    }

    if (date === today) {
      usePrayerTimesStore.getState().setTodayData(response.data, Date.now());
      queryClient.invalidateQueries({
        queryKey: ["prayerTracking", "local", getEffectiveToday()],
      });
    }

    return response;
  } catch (error) {
    const isSimulatedOffline = (error as Error)?.message === "Simulated offline for Expo testing";
    if (!isSimulatedOffline) {
      console.error("❌ Aladhan API hatası:", error);
    }
    if (date === today && storeData?.date?.gregorian) {
      const g = storeData.date.gregorian;
      const cacheDate = `${String(g.day).padStart(2, "0")}-${String(g.month?.number ?? 0).padStart(2, "0")}-${g.year}`;
      if (cacheDate === today) {
        return { code: 200, status: "OK", data: storeData };
      }
    }
    if (typeof __DEV__ !== "undefined" && __DEV__ && isSimulatedOffline) {
      try {
        const raw = await storage.getString("prayer-times-cache");
        if (raw) {
          const parsed = JSON.parse(raw) as { state?: { todayData?: typeof storeData } };
          const fromStorage = parsed?.state?.todayData ?? null;
          if (fromStorage?.date?.gregorian) {
            const g = fromStorage.date.gregorian;
            const cacheDate = `${String(g.day).padStart(2, "0")}-${String(g.month?.number ?? 0).padStart(2, "0")}-${g.year}`;
            if (cacheDate === today) {
              return { code: 200, status: "OK", data: fromStorage };
            }
          }
        }
      } catch {
        // ignore
      }
    }
    throw error;
  }
}

export type PrayerTimesDayData = {
  date: string; // DD-MM-YYYY
  data: AladhanPrayerTimesResponse["data"];
};

export interface PrayerTimesWeekParams {
  latitude: number;
  longitude: number;
  method?: number;
  calendarMethod?: string;
  timezone?: string;
}

/** Calendar API response: one entry per day of the month. */
export interface AladhanCalendarResponse {
  code: number;
  status: string;
  data: AladhanPrayerTimesResponse["data"][];
}

export interface PrayerTimesCalendarParams {
  latitude: number;
  longitude: number;
  method?: number;
  year: number;
  month: number; // 1–12
  calendarMethod?: string;
  timezone?: string;
}

/**
 * Fetch prayer times for a full month via Aladhan /calendar API.
 * Use this as the primary source; persist result with prayerTimesRepo.upsertMonth().
 */
export async function fetchPrayerTimesCalendar(
  params: PrayerTimesCalendarParams
): Promise<AladhanCalendarResponse> {
  const {
    latitude,
    longitude,
    method = 13,
    calendarMethod = "DIYANET",
    year,
    month,
    timezone,
  } = params;

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    const simulateOffline = await storage.getBoolean("simulatePrayerTimesOffline");
    if (simulateOffline) {
      throw new Error("Simulated offline for Expo testing");
    }
  }

  const response = await aladhanClient.get<AladhanCalendarResponse>("/calendar", {
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    method: method.toString(),
    calendarMethod,
    year: year.toString(),
    month: month.toString(),
    ...(timezone && { timezone }),
  });

  if (response.code !== 200) {
    throw new Error(response.status || "Failed to fetch prayer times calendar");
  }

  return response;
}

/**
 * Fetch prayer times for today and the next 6 days (7 days total) via parallel /timings requests.
 * Legacy: prefer fetchPrayerTimesCalendar + SQLite for new flow.
 */
export async function fetchPrayerTimesForWeek(
  params: PrayerTimesWeekParams
): Promise<PrayerTimesDayData[]> {
  const {
    latitude,
    longitude,
    method = 13,
    calendarMethod = "DIYANET",
    timezone,
  } = params;

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    const simulateOffline = await storage.getBoolean("simulatePrayerTimesOffline");
    if (simulateOffline) {
      throw new Error("Simulated offline for Expo testing");
    }
  }

  const baseParams = {
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    method: method.toString(),
    calendarMethod,
    ...(timezone && { timezone }),
  };

  const results = await Promise.all(
    [0, 1, 2, 3, 4, 5, 6].map(async (offset) => {
      const date = getDateDDMMYYYY(offset);
      const response = await aladhanClient.get<AladhanPrayerTimesResponse>("/timings", {
        ...baseParams,
        date,
      });
      if (response.code !== 200) {
        throw new Error(response.status || "Failed to fetch prayer times");
      }
      return { date, data: response.data };
    })
  );

  return results;
}
