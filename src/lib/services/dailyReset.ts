/**
 * Daily Reset Service
 * Handles daily prayer state reset and queue insertion
 * 
 * Logic:
 * 1. At start of new day (after imsak time)
 * 2. Read current daily prayer state
 * 3. Convert to boolean payload
 * 4. Insert into sync queue
 * 5. Reset daily state for new day
 */

import { prayerTrackingRepo } from '@/lib/database/sqlite/prayer-tracking/repository';
import { storage } from '@/lib/storage/mmkv';
import { format } from 'date-fns';
import type { AladhanPrayerTimesResponse } from '@/lib/api/services/prayerTimes';

const LAST_RESET_DATE_KEY = 'prayer_tracking_last_reset_date';

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Get today's date in DD-MM-YYYY format (Aladhan API)
 */
export function getTodayDDMMYYYY(): string {
  return format(new Date(), 'dd-MM-yyyy');
}

/**
 * Get date in DD-MM-YYYY format for today + offsetDays (Aladhan API)
 */
export function getDateDDMMYYYY(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return format(d, 'dd-MM-yyyy');
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
export function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return format(yesterday, 'yyyy-MM-dd');
}

/**
 * Parse Imsak time from Aladhan API response
 * Format: "HH:mm" (24-hour)
 */
export function parseImsakTime(timings: AladhanPrayerTimesResponse['data']['timings']): Date {
  const imsakString = timings.Imsak; // "HH:mm" format
  const today = new Date();
  const [hours, minutes] = imsakString.split(':').map(Number);
  
  const imsakDate = new Date(today);
  imsakDate.setHours(hours, minutes, 0, 0);
  
  return imsakDate;
}

/**
 * Check if current time is after imsak time
 */
export function isAfterImsak(imsakTime: Date): boolean {
  const now = new Date();
  return now >= imsakTime;
}

/**
 * Check if it's a new day (after imsak time)
 */
export function isNewDay(
  lastResetDate: string | null,
  imsakTime: Date | null
): boolean {
  if (!imsakTime) {
    // Fallback: use date change
    const today = getTodayDateString();
    return lastResetDate !== today;
  }

  // Check if imsak time has passed
  if (isAfterImsak(imsakTime)) {
    const today = getTodayDateString();
    return lastResetDate !== today;
  }

  return false;
}

class DailyResetService {
  private lastResetDate: string | null = null;

  /**
   * Initialize and check if reset is needed
   * @param prayerTimesResponse Optional prayer times response to get imsak time
   */
  async initialize(
    prayerTimesResponse?: AladhanPrayerTimesResponse | null
  ): Promise<void> {
    // Restore lastResetDate from storage (survives app restart)
    const stored = await storage.getString(LAST_RESET_DATE_KEY);
    if (stored != null) this.lastResetDate = stored;

    let imsakTime: Date | null = null;

    if (prayerTimesResponse?.data?.timings) {
      imsakTime = parseImsakTime(prayerTimesResponse.data.timings);
    }

    const newDay = isNewDay(this.lastResetDate, imsakTime);

    // Check if we need to reset
    if (newDay) {
      await this.performDailyReset();
    }
  }

  /**
   * Perform daily reset:
   * 1. Read current state (yesterday's data)
   * 2. Convert to boolean payload
   * 3. Add to sync queue
   * 4. Reset daily state for new day
   */
  async performDailyReset(): Promise<void> {
    const today = getTodayDateString();

    try {
      // 1. Read current state (before reset)
      const currentState = await prayerTrackingRepo.getCurrentPrayerState();

      // 2. If state exists, add to sync queue (use current date as yesterday)
      if (currentState) {
        // Use current state's date (yesterday)
        await prayerTrackingRepo.addToSyncQueue(currentState.date, currentState);
      }

      // 3. Reset daily state for new day
      await prayerTrackingRepo.resetDailyPrayerState(today);

      // 4. Update last reset date (memory + persisted)
      this.lastResetDate = today;
      await storage.set(LAST_RESET_DATE_KEY, today);

      console.log('[DailyReset] Daily reset completed', {
        previousDate: currentState?.date,
        today,
        hadState: !!currentState,
      });
    } catch (error) {
      console.error('[DailyReset] Reset error:', error);
      throw error;
    }
  }

  /**
   * Get last reset date
   */
  getLastResetDate(): string | null {
    return this.lastResetDate;
  }

  /**
   * Set last reset date (for testing/debugging)
   */
  setLastResetDate(date: string | null): void {
    this.lastResetDate = date;
  }
}

// Singleton instance
export const dailyResetService = new DailyResetService();

