/**
 * Prayer Tracking Service
 * Handles prayer status tracking via Supabase RPC functions and prayer_logs table.
 */

import { supabase } from '@/lib/supabase/client';
import type {
  PrayerTrackingData,
  UpdatePrayerStatusRequest,
} from '@/types/prayer-tracking';
import type { PrayerLogRow } from '@/lib/services/streakCalculation';

const PRAYER_LOGS_DAYS = 60;

/**
 * Fetch last N days of prayer logs from Supabase for streak calculation.
 * Table has boolean columns: fajr, dhuhr, asr, maghrib, isha.
 */
export async function getPrayerLogsRecent(): Promise<PrayerLogRow[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - PRAYER_LOGS_DAYS);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('prayer_logs')
    .select('date, fajr, dhuhr, asr, maghrib, isha')
    .gte('date', startStr)
    .lte('date', endStr)
    .order('date', { ascending: false });

  if (error) {
    console.error('[getPrayerLogsRecent]', error);
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{
    date: string;
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
  }>;
  return rows.map((r) => ({
    date: r.date,
    fajr: !!r.fajr,
    dhuhr: !!r.dhuhr,
    asr: !!r.asr,
    maghrib: !!r.maghrib,
    isha: !!r.isha,
  }));
}

/**
 * Get today's prayer log
 * Auto-creates log if missing
 */
export async function getTodayPrayerLog(): Promise<PrayerTrackingData> {
  try {
    const { data, error } = await supabase.rpc('get_today_prayer_log');

    if (error) {
      console.error('[getTodayPrayerLog] RPC Error:', error);
      throw new Error(`Failed to get prayer log: ${error.message}`);
    }

    // Parse JSONB response
    const result = typeof data === 'string' ? JSON.parse(data) : data;

    return {
      prayers: result.prayers,
      percent: result.percent || 0,
    };
  } catch (error) {
    console.error('[getTodayPrayerLog] Error:', error);
    throw error instanceof Error
      ? error
      : new Error('Failed to get prayer tracking data');
  }
}

/**
 * Update prayer status for today
 */
export async function updatePrayerStatus(
  request: UpdatePrayerStatusRequest
): Promise<void> {
  try {
    const { prayer, status } = request;

    const { error } = await supabase.rpc('update_prayer_status', {
      p_prayer_name: prayer,
      p_status: status,
    } as any);

    if (error) {
      console.error('[updatePrayerStatus] RPC Error:', error);
      throw new Error(`Failed to update prayer status: ${error.message}`);
    }
  } catch (error) {
    console.error('[updatePrayerStatus] Error:', error);
    throw error instanceof Error
      ? error
      : new Error('Failed to update prayer status');
  }
}

