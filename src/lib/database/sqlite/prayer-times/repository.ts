/**
 * SQLite repository for prayer times month cache (Aladhan calendar API).
 * One row per (year, month, latitude, longitude, method); data = JSON array of day objects.
 */

import { getDb } from "../db";
import type { AladhanPrayerTimesResponse } from "@/lib/api/services/prayerTimes";

export type PrayerTimesDayData = AladhanPrayerTimesResponse["data"];

export interface PrayerTimesSyncQueueItem {
  id: number;
  year: number;
  month: number;
  latitude: number;
  longitude: number;
  method: number;
  created_at: number;
}

/**
 * Upsert one month of prayer times. Overwrites existing row for same (year, month, lat, lng, method).
 */
export async function upsertMonth(
  year: number,
  month: number,
  latitude: number,
  longitude: number,
  method: number,
  data: PrayerTimesDayData[]
): Promise<void> {
  const db = await getDb();
  const syncedAt = Date.now();
  const dataJson = JSON.stringify(data);
  await db.runAsync(
    `INSERT OR REPLACE INTO prayer_times_month_cache (year, month, latitude, longitude, method, data, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [year, month, latitude, longitude, method, dataJson, syncedAt]
  );
}

/**
 * Get cached month data for given (year, month, latitude, longitude, method). Returns null if not found.
 */
export async function getMonth(
  year: number,
  month: number,
  latitude: number,
  longitude: number,
  method: number
): Promise<PrayerTimesDayData[] | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ data: string }>(
    `SELECT data FROM prayer_times_month_cache
     WHERE year = ? AND month = ? AND latitude = ? AND longitude = ? AND method = ?`,
    [year, month, latitude, longitude, method]
  );
  if (!row?.data) return null;
  try {
    return JSON.parse(row.data) as PrayerTimesDayData[];
  } catch {
    return null;
  }
}

/**
 * Get single day data by DD-MM-YYYY. Uses current month cache for the date's year/month and location.
 * Returns null if cache miss or date not in array.
 */
export async function getDataByDate(
  dateDDMMYYYY: string,
  latitude: number,
  longitude: number,
  method: number
): Promise<PrayerTimesDayData | null> {
  const parts = dateDDMMYYYY.split("-").map(Number);
  const year = parts[2] ?? 0;
  const month = parts[1] ?? 0;
  const monthData = await getMonth(year, month, latitude, longitude, method);
  if (!monthData?.length) return null;
  const day = monthData.find(
    (item) => item.date?.gregorian?.date === dateDDMMYYYY
  );
  return day ?? null;
}

/**
 * Get synced_at for the current month (for stale check). Returns null if no cache.
 */
export async function getMonthSyncedAt(
  year: number,
  month: number,
  latitude: number,
  longitude: number,
  method: number
): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ synced_at: number }>(
    `SELECT synced_at FROM prayer_times_month_cache
     WHERE year = ? AND month = ? AND latitude = ? AND longitude = ? AND method = ?`,
    [year, month, latitude, longitude, method]
  );
  return row?.synced_at ?? null;
}

/**
 * Add a month fetch to the sync queue (when month changed while offline).
 */
export async function addToPrayerTimesSyncQueue(
  year: number,
  month: number,
  latitude: number,
  longitude: number,
  method: number
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO prayer_times_sync_queue (year, month, latitude, longitude, method, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [year, month, latitude, longitude, method, Date.now()]
  );
}

/**
 * Get all pending prayer times sync queue items (for reconnect).
 */
export async function getPrayerTimesSyncQueue(): Promise<
  PrayerTimesSyncQueueItem[]
> {
  const db = await getDb();
  const rows = await db.getAllAsync<PrayerTimesSyncQueueItem>(
    `SELECT id, year, month, latitude, longitude, method, created_at
     FROM prayer_times_sync_queue ORDER BY created_at ASC`
  );
  return rows ?? [];
}

/**
 * Remove one item from the sync queue after successful fetch.
 */
export async function removeFromPrayerTimesSyncQueue(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM prayer_times_sync_queue WHERE id = ?`, [id]);
}
