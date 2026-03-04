/**
 * Islamic day boundary: day ends at next day's Fajr (imsak).
 * All "today" for prayer/streak uses effective date, never midnight.
 */

import { format, subDays } from 'date-fns';
import { usePrayerTimesStore } from '@/lib/storage/prayerTimesStore';

/**
 * Get effective prayer date (YYYY-MM-DD).
 * If now < todayFajr → still yesterday (Islamic).
 * If now >= todayFajr → today (Islamic).
 * When todayFajr is null, fallback to calendar today (midnight-based).
 */
export function getEffectivePrayerDate(
  now: Date,
  todayFajr: Date | null
): string {
  if (!todayFajr) {
    return format(now, 'yyyy-MM-dd');
  }
  const fajrDateOnly = new Date(todayFajr.getFullYear(), todayFajr.getMonth(), todayFajr.getDate());
  if (now < todayFajr) {
    const yesterday = subDays(fajrDateOnly, 1);
    return format(yesterday, 'yyyy-MM-dd');
  }
  return format(fajrDateOnly, 'yyyy-MM-dd');
}

/**
 * Get today's Fajr time (as Date) from prayer times store.
 * Uses Imsak or Fajr from today's timings. Returns null if no prayer times.
 */
export function getTodayFajrTime(): Date | null {
  const todayData = usePrayerTimesStore.getState().getTodayData();
  const timings = todayData?.timings;
  if (!timings) return null;
  const timeString = timings.Imsak ?? timings.Fajr;
  if (!timeString || typeof timeString !== 'string') return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const today = new Date();
  const fajr = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, 0, 0);
  return fajr;
}

/**
 * Get effective "today" for prayer (Islamic day boundary).
 * Use this instead of getTodayDateString() for prayer state, sync, and streak.
 */
export function getEffectiveToday(): string {
  const now = new Date();
  const todayFajr = getTodayFajrTime();
  return getEffectivePrayerDate(now, todayFajr);
}
