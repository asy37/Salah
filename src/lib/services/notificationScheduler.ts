/**
 * Notification Scheduler Service
 * Handles scheduling all types of notifications based on prayer times and settings
 */

import { parse } from 'date-fns';
import { notificationService } from '@/lib/notifications/NotificationService';
import { useNotificationSettings } from '@/lib/storage/notificationSettings';
import { getDailyAyahNumber } from '@/lib/quran/dailyAyah';
import { getEffectiveToday } from '@/lib/services/prayerDate';
import { getPrayerLogsRecent } from '@/lib/api/services/prayerTracking';
import { calculateStreakFromSupabaseLogs } from '@/lib/services/streakCalculation';
import type {
  AladhanPrayerTimesResponse,
  PrayerTimesDayData,
} from '@/lib/api/services/prayerTimes';
import { createPrayerTime } from '@/components/prayer-list/utils/utils';
import { Platform } from 'react-native';

// Prayer order for finding next prayer
const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

interface PrayerTimeData {
  date: string;
  prayers: Array<{ name: string; time: Date }>;
}

/**
 * Convert single-day Aladhan response to PrayerTimeData (one day only).
 * Used when only today's data is available.
 */
function convertPrayerTimesToData(
  response: AladhanPrayerTimesResponse,
  days: number = 7
): PrayerTimeData[] {
  const result: PrayerTimeData[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const timings = response.data.timings;

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + i);
    const dateString = currentDate.toISOString().slice(0, 10);

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
 * Convert 7-day API data to PrayerTimeData[] (one entry per day with correct timings).
 */
function convertWeekDataToPrayerTimeData(weekData: PrayerTimesDayData[]): PrayerTimeData[] {
  return weekData.map(({ date: ddMmYyyy, data }) => {
    const baseDate = parse(ddMmYyyy, 'dd-MM-yyyy', new Date());
    const dateString = baseDate.toISOString().slice(0, 10);
    const timings = data.timings;
    const prayers = PRAYER_ORDER.map((prayerName) => {
      const timeString = timings[prayerName as keyof typeof timings];
      if (!timeString) return null;
      const time = createPrayerTime(timeString, baseDate);
      return { name: prayerName, time } as { name: string; time: Date };
    }).filter((p): p is { name: string; time: Date } => p !== null);
    return { date: dateString, prayers };
  });
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
  private scheduleAllInProgress: Promise<void> | null = null;

  /** Ezan, öncesi, namaz durumu/late, günlük ayet ve seri bildirimlerini ayarlara göre planla veya iptal et. */
  private async applyScheduleFromSettings(
    settings: ReturnType<typeof useNotificationSettings.getState>,
    limitedPrayerTimes: PrayerTimeData[],
    effectiveDays: number
  ): Promise<void> {
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

    if (settings.prePrayerAlerts) {
      await notificationService.schedulePrePrayerAlerts(
        limitedPrayerTimes,
        effectiveDays,
        settings.vibration
      );
    } else {
      await notificationService.cancelNotificationsByType('pre_prayer');
    }

    if (settings.prayerReminderEnabled) {
      await this.schedulePrayerStatusAndLateReminders(
        limitedPrayerTimes,
        effectiveDays,
        settings.vibration
      );
    } else {
      await notificationService.cancelNotificationsByType('prayer_reminder');
      await notificationService.cancelNotificationsByType('prayer_status');
      await notificationService.cancelNotificationsByType('prayer_late_reminder');
    }

    if (settings.dailyVerseEnabled) {
      await this.scheduleDailyVerse(settings.dailyVerseTime);
    } else {
      await notificationService.cancelNotificationsByType('daily_verse');
    }

    if (settings.streakEnabled) {
      await this.scheduleStreak(settings.streakTime);
    } else {
      await notificationService.cancelNotificationsByType('streak');
    }
  }

  /** Namaz durumu (15-20 dk) ve namaz hatırlatma (1 saat). Bugün "kıldım" işaretlenmiş vakitler atlanır. */
  private async schedulePrayerStatusAndLateReminders(
    limitedPrayerTimes: PrayerTimeData[],
    effectiveDays: number,
    vibration: boolean
  ): Promise<void> {
    const { prayerTrackingRepo } = await import('@/lib/database/sqlite/prayer-tracking/repository');
    const today = getEffectiveToday();
    const state = await prayerTrackingRepo.getCurrentPrayerState();
    const alreadyPrayedToday: Record<string, boolean> = state?.date === today
      ? {
          fajr: state.fajr === 'prayed',
          dhuhr: state.dhuhr === 'prayed',
          asr: state.asr === 'prayed',
          maghrib: state.maghrib === 'prayed',
          isha: state.isha === 'prayed',
        }
      : {};
    await notificationService.schedulePrayerStatusNotifications(
      limitedPrayerTimes,
      effectiveDays,
      vibration,
      { todayDate: today, alreadyPrayedToday }
    );
    await notificationService.schedulePrayerLateReminderNotifications(
      limitedPrayerTimes,
      effectiveDays,
      vibration,
      { todayDate: today, alreadyPrayedToday }
    );
  }

  /**
   * Schedule all notifications from 7-day data (correct times per day).
   */
  async scheduleAllNotificationsFromWeek(weekData: PrayerTimesDayData[]): Promise<void> {
    const prayerTimes = convertWeekDataToPrayerTimeData(weekData);
    await this.scheduleWithPrayerTimes(prayerTimes, 7);
  }

  /**
   * Schedule all notifications based on prayer times and settings.
   * Aynı anda yalnızca bir çalıştırma yapılır; böylece ezan bildirimi tekrarlanmaz.
   * Tek günlük response verilirse aynı gün 7 kez kopyalanır (fallback); 7 günlük veri için scheduleAllNotificationsFromWeek kullanın.
   */
  async scheduleAllNotifications(
    prayerTimesResponse: AladhanPrayerTimesResponse,
    days: number = 7
  ): Promise<void> {
    const run = async () => {
      const settings = useNotificationSettings.getState();
      const prayerTimes = convertPrayerTimesToData(prayerTimesResponse, days);

      const totalPrayerCount = prayerTimes.reduce(
        (sum, day) => sum + day.prayers.length,
        0
      );
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

      let effectiveDays = days;
      if (Platform.OS === 'ios' && estimatedTotal > 64 && totalPrayerCount > 0) {
        const ratio = 64 / estimatedTotal;
        effectiveDays = Math.max(1, Math.floor(days * ratio));
      }

      const limitedPrayerTimes =
        effectiveDays < prayerTimes.length
          ? prayerTimes.slice(0, effectiveDays)
          : prayerTimes;

      await this.applyScheduleFromSettings(
        settings,
        limitedPrayerTimes,
        effectiveDays
      );
    };

    await this.scheduleAllInProgress;
    this.scheduleAllInProgress = run();
    try {
      await this.scheduleAllInProgress;
    } finally {
      this.scheduleAllInProgress = null;
    }
  }

  private async scheduleWithPrayerTimes(
    prayerTimes: PrayerTimeData[],
    days: number
  ): Promise<void> {
    const run = async () => {
      const settings = useNotificationSettings.getState();
      const totalPrayerCount = prayerTimes.reduce(
        (sum, day) => sum + day.prayers.length,
        0
      );
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

      let effectiveDays = days;
      if (Platform.OS === 'ios' && estimatedTotal > 64 && totalPrayerCount > 0) {
        const ratio = 64 / estimatedTotal;
        effectiveDays = Math.max(1, Math.floor(days * ratio));
      }

      const limitedPrayerTimes =
        effectiveDays < prayerTimes.length
          ? prayerTimes.slice(0, effectiveDays)
          : prayerTimes;

      await this.applyScheduleFromSettings(
        settings,
        limitedPrayerTimes,
        effectiveDays
      );
    };

    await this.scheduleAllInProgress;
    this.scheduleAllInProgress = run();
    try {
      await this.scheduleAllInProgress;
    } finally {
      this.scheduleAllInProgress = null;
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
   * Schedule streak notification (streak from Supabase)
   */
  async scheduleStreak(time: string): Promise<void> {
    try {
      const effectiveToday = getEffectiveToday();
      const logs = await getPrayerLogsRecent();
      const streak = calculateStreakFromSupabaseLogs(logs, effectiveToday);
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
