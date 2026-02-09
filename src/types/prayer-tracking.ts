/**
 * Prayer Tracking Types
 * Based on Supabase prayer_logs table structure
 */

export type PrayerStatus = 'upcoming' | 'prayed' | 'unprayed' | 'later';

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerStatuses {
  fajr: PrayerStatus;
  dhuhr: PrayerStatus;
  asr: PrayerStatus;
  maghrib: PrayerStatus;
  isha: PrayerStatus;
}

export interface PrayerTrackingData {
  prayers: PrayerStatuses;
  percent: number; // 0-100
}

export interface PrayerStreak {
  count: number; // consecutive days with ALL prayers prayed
}

export interface UpdatePrayerStatusRequest {
  prayer: PrayerName;
  status: PrayerStatus;
}

export interface PrayerWithTime {
  prayer_name: PrayerName;
  scheduledTime: string;
  displayName?: string;
  time?: string;
  icon?: string;
}

