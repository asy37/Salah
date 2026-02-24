/**
 * Prayer Tracking Service
 * Handles prayer status tracking via Supabase RPC functions
 */

import { supabase } from '@/lib/supabase/client';
import type {
  PrayerTrackingData,
  UpdatePrayerStatusRequest,
} from '@/types/prayer-tracking';

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

