/**
 * Notification Scheduler Service
 * Handles scheduling all types of notifications based on prayer times and settings
 */

import { notificationService } from '@/lib/notifications/NotificationService';
import { useNotificationSettings } from '@/lib/storage/notificationSettings';
import { getDailyAyahNumber } from '@/lib/quran/dailyAyah';
import { prayerTrackingRepo } from '@/lib/database/sqlite/prayer-tracking/repository';
import type { AladhanPrayerTimesResponse } from '@/lib/api/services/prayerTimes';
import { createPrayerTime } from '@/components/prayer-list/utils/utils';
import { Platform } from 'react-native';

// Prayer order for finding next prayer
const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

interface PrayerTimeData {
  date: string;
  prayers: Array<{ name: string; time: Date }>;
}

/**
 * Convert Aladhan API response to prayer time data format
 */
function convertPrayerTimesToData(
  response: AladhanPrayerTimesResponse,
  days: number = 7
): PrayerTimeData[] {
  const result: PrayerTimeData[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + i);
    const dateString = currentDate.toISOString().slice(0, 10);

    const timings = response.data.timings;
    const prayers = PRAYER_ORDER.map((prayerName) => {
      const timeString = timings[prayerName as keyof typeof timings];
      if (!timeString) return null;

      const prayerDate = createPrayerTime(timeString, currentDate);
      return {
        name: prayerName,
        time: prayerDate,
      } as { name: string; time: Date };
    }).filter((p): p is { name: string; time: Date } => p !== null);

    result.push({
      date: dateString,
      prayers,
    });
  }

  return result;
}

/**
 * Get next prayer time for a given prayer
 */
function getNextPrayerTime(
  prayerTimes: PrayerTimeData[],
  currentPrayerName: string
): Date | null {
  const prayerIndex = PRAYER_ORDER.indexOf(currentPrayerName as any);
  if (prayerIndex === -1) return null;

  // Check if there's a next prayer today
  const today = prayerTimes[0];
  if (prayerIndex < PRAYER_ORDER.length - 1) {
    const nextPrayerName = PRAYER_ORDER[prayerIndex + 1];
    const nextPrayer = today.prayers.find((p) => p.name === nextPrayerName);
    if (nextPrayer) {
      return nextPrayer.time;
    }
  }

  // Check tomorrow's first prayer
  if (prayerTimes.length > 1) {
    const tomorrow = prayerTimes[1];
    const firstPrayer = tomorrow.prayers[0];
    if (firstPrayer) {
      return firstPrayer.time;
    }
  }

  return null;
}

class NotificationSchedulerService {
  /**
   * Schedule all notifications based on prayer times and settings
   */
  async scheduleAllNotifications(
    prayerTimesResponse: AladhanPrayerTimesResponse,
    days: number = 7
  ): Promise<void> {
    const settings = useNotificationSettings.getState();
    const prayerTimes = convertPrayerTimesToData(prayerTimesResponse, days);

    // Calculate approximate total number of notifications we plan to schedule (for iOS 64 limit)
    let totalPrayerCount = 0;
    for (const day of prayerTimes) {
      totalPrayerCount += day.prayers.length;
    }
    const estimatedPrayerTimeNotifs =
      settings.adhanNotifications ? totalPrayerCount : 0;
    const estimatedReminderNotifs =
      settings.prayerReminderEnabled ? totalPrayerCount : 0;
    const estimatedPrePrayerNotifs =
      settings.prePrayerAlerts ? totalPrayerCount : 0;
    const estimatedOtherNotifs =
      (settings.dailyVerseEnabled ? 1 : 0) + (settings.streakEnabled ? 1 : 0);
    const estimatedTotal =
      estimatedPrayerTimeNotifs +
      estimatedReminderNotifs +
      estimatedPrePrayerNotifs +
      estimatedOtherNotifs;

    // On iOS, cap total scheduled notifications to avoid UNNotificationTrigger assertion
    let effectiveDays = days;
    if (Platform.OS === 'ios' && estimatedTotal > 64 && totalPrayerCount > 0) {
      const ratio = 64 / estimatedTotal;
      effectiveDays = Math.max(1, Math.floor(days * ratio));
    }

    const limitedPrayerTimes =
      effectiveDays < prayerTimes.length
        ? prayerTimes.slice(0, effectiveDays)
        : prayerTimes;

    // Schedule prayer time notifications (ezan)
    if (settings.adhanNotifications) {
      await notificationService.schedulePrayerTimeNotifications(
        limitedPrayerTimes,
        effectiveDays,
        settings.playAdhanAudio,
        settings.vibration
      );
    } else {
      await notificationService.cancelNotificationsByType('prayer_time');
    }

    // Schedule pre-prayer alerts (15 minutes before)
    if (settings.prePrayerAlerts) {
      await notificationService.schedulePrePrayerAlerts(
        limitedPrayerTimes,
        effectiveDays,
        settings.vibration
      );
    } else {
      await notificationService.cancelNotificationsByType('pre_prayer');
    }

    // Schedule prayer reminder notifications (30 minutes after)
    if (settings.prayerReminderEnabled) {
      await notificationService.schedulePrayerReminderNotifications(
        limitedPrayerTimes,
        effectiveDays,
        settings.vibration
      );
    } else {
      await notificationService.cancelNotificationsByType('prayer_reminder');
    }

    // Schedule daily verse notification
    if (settings.dailyVerseEnabled) {
      await this.scheduleDailyVerse(settings.dailyVerseTime);
    } else {
      await notificationService.cancelNotificationsByType('daily_verse');
    }

    // Schedule streak notification
    if (settings.streakEnabled) {
      await this.scheduleStreak(settings.streakTime);
    } else {
      await notificationService.cancelNotificationsByType('streak');
    }
  }

  /**
   * Schedule daily verse notification
   */
  async scheduleDailyVerse(time: string): Promise<void> {
    try {
      // Get daily ayah number
      const ayahNumber = getDailyAyahNumber();
      
      // We need to get ayah text from quran data
      // For now, we'll use a placeholder - this should be enhanced to get actual text
      // TODO: Get actual ayah text from quran data store
      const ayahText = 'Günlük ayet için uygulamayı açın';

      // Get surah number from ayah number (simplified - should use proper lookup)
      // This is a placeholder - proper implementation would look up surah from ayah number
      // TODO: Implement proper surah lookup from ayah number
      const surahNumber = 1;

      await notificationService.scheduleDailyVerseNotification(
        ayahNumber,
        surahNumber,
        ayahText,
        time
      );
    } catch (error) {
      console.error('[NotificationScheduler] Failed to schedule daily verse:', error);
    }
  }

  /**
   * Schedule streak notification
   */
  async scheduleStreak(time: string): Promise<void> {
    try {
      const streak = await prayerTrackingRepo.calculateLocalStreak();
      await notificationService.scheduleStreakNotification(streak, time);
    } catch (error) {
      console.error('[NotificationScheduler] Failed to schedule streak:', error);
    }
  }

  /**
   * Handle "remind later" action - schedule reminder for next prayer
   */
  async scheduleReminderForNextPrayer(
    currentPrayerName: string,
    prayerTimesResponse: AladhanPrayerTimesResponse
  ): Promise<void> {
    const prayerTimes = convertPrayerTimesToData(prayerTimesResponse, 2);
    const nextPrayerTime = getNextPrayerTime(prayerTimes, currentPrayerName);

    if (!nextPrayerTime) {
      console.warn('[NotificationScheduler] Could not find next prayer time');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    await notificationService.schedulePrayerReminderLater(
      currentPrayerName,
      nextPrayerTime,
      today
    );
  }
}

// Singleton instance
export const notificationScheduler = new NotificationSchedulerService();
