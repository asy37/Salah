/**
 * Push Token Sync Service
 * Registers Expo push token with Supabase and syncs user_settings for server-side notifications
 */

import { supabase } from '@/lib/supabase/client';
import { notificationService } from '@/lib/notifications/NotificationService';
import { useNotificationSettings } from '@/lib/storage/notificationSettings';
import { Platform } from 'react-native';

export async function syncPushTokenAndSettings(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const token = await notificationService.registerPushToken();
    if (!token) return;

    const { error: tokenError } = await (supabase as any).from('push_tokens').upsert(
      {
        user_id: user.id,
        token,
        platform: Platform.OS as 'ios' | 'android',
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,platform',
      }
    );

    if (tokenError) {
      console.warn('[PushTokenSync] Failed to upsert push token:', tokenError);
    }

    const settings = useNotificationSettings.getState();
    const { error: settingsError } = await (supabase as any).from('user_settings').upsert(
      {
        user_id: user.id,
        daily_verse_enabled: settings.dailyVerseEnabled,
        daily_verse_time: settings.dailyVerseTime,
        streak_enabled: settings.streakEnabled,
        streak_time: settings.streakTime,
        notification_settings: {
          adhanNotifications: settings.adhanNotifications,
          prePrayerAlerts: settings.prePrayerAlerts,
          playAdhanAudio: settings.playAdhanAudio,
          vibration: settings.vibration,
        },
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

    if (settingsError) {
      console.warn('[PushTokenSync] Failed to upsert user_settings:', settingsError);
    }
  } catch (e) {
    console.warn('[PushTokenSync] Error:', e);
  }
}
