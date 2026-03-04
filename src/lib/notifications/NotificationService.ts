/**
 * NotificationService
 * 
 * iOS-safe notification service that combines:
 * - Local scheduled notifications (primary)
 * - Remote push notifications (secondary)
 * - Background tasks (critical operations)
 * 
 * Note: expo-notifications is not fully supported in Expo Go.
 * Use a development build for full functionality.
 */

import { Platform } from 'react-native';
import type { PrayerName } from '@/types/prayer-tracking';
import { i18n } from '@/i18n';

// Conditional import for Expo Go compatibility
// Use lazy loading to avoid errors in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;
let TaskManager: typeof import('expo-task-manager') | null = null;
let BackgroundFetch: typeof import('expo-background-fetch') | null = null;

// app.json plugin "sounds" ile aynı base dosya adları (underscore)
const PRAYER_SOUND_MAP: Record<string, string> = {
  Fajr: 'fajr_ezan.mp3',
  Dhuhr: 'dhuhr_ezan.mp3',
  Asr: 'asr_ezan.mp3',
  Maghrib: 'maghrib_ezan.mp3',
  Isha: 'isha_ezan.mp3',
  fajr: 'fajr_ezan.mp3',
  dhuhr: 'dhuhr_ezan.mp3',
  asr: 'asr_ezan.mp3',
  maghrib: 'maghrib_ezan.mp3',
  isha: 'isha_ezan.mp3',
};

/**
 * Get sound file for prayer
 */
function getPrayerSound(prayerName: string): string | false {
  return PRAYER_SOUND_MAP[prayerName] || false;
}

// Notification categories
export const NOTIFICATION_CATEGORIES = {
  PRAYER_TIME: 'PRAYER_TIME',
  PRE_PRAYER: 'PRE_PRAYER',
  PRAYER_STATUS: 'PRAYER_STATUS',           // Ezan sonrası 15-20dk: "Namazı kıldın mı?" (butonlu)
  PRAYER_LATE_REMINDER: 'PRAYER_LATE_REMINDER', // Ezan sonrası 1 saat: hatırlatma
  PRAYER_REMINDER: 'PRAYER_REMINDER',
  PRAYER_REMINDER_LATER: 'PRAYER_REMINDER_LATER',
  DAILY_VERSE: 'DAILY_VERSE',
  STREAK: 'STREAK',
} as const;

// Notification action identifiers
export const NOTIFICATION_ACTIONS = {
  PRAYER_MARKED_PRAYED: 'prayer_marked_prayed',
  PRAYER_REMIND_LATER: 'prayer_remind_later',
} as const;

// Lazy load modules to avoid errors in Expo Go
function loadNotificationModules() {
  if (Notifications !== null) {
    return; // Already loaded
  }

  try {
    // Use dynamic require to avoid errors at module load time
    // This will only fail when the function is called, not at import time
    Notifications = require('expo-notifications');
    TaskManager = require('expo-task-manager');
    BackgroundFetch = require('expo-background-fetch');
  } catch (error) {
    // Silently fail in Expo Go - this is expected
    // The error will only occur when the service is actually used
    Notifications = null;
    TaskManager = null;
    BackgroundFetch = null;
  }
}

// Expose a getter for Notifications that lazy loads
const getNotifications = () => {
  loadNotificationModules();
  return Notifications;
};

// Configure notification behavior (only if available)
// This will be called when the service is first used
function configureNotifications() {
  const NotificationsModule = getNotifications();
  if (NotificationsModule) {
    NotificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Set up notification categories with action buttons
    // PRAYER_STATUS: "Namazı kıldın mı?" butonu olan bildirim (ezan sonrası 15-20dk)
    const prayerActionButtons = [
      {
        identifier: NOTIFICATION_ACTIONS.PRAYER_MARKED_PRAYED,
        buttonTitle: i18n.t('notification.markedPrayedButton'),
        options: { opensAppToForeground: false },
      },
      {
        identifier: NOTIFICATION_ACTIONS.PRAYER_REMIND_LATER,
        buttonTitle: i18n.t('notification.remindLaterButton'),
        options: { opensAppToForeground: false },
      },
    ];

    NotificationsModule.setNotificationCategoryAsync(
      NOTIFICATION_CATEGORIES.PRAYER_STATUS,
      prayerActionButtons
    );

    // PRAYER_REMINDER: eski uyumluluk için kategori (aynı butonlar)
    NotificationsModule.setNotificationCategoryAsync(
      NOTIFICATION_CATEGORIES.PRAYER_REMINDER,
      prayerActionButtons
    );
  }
}

/**
 * Get localized prayer display name
 */
function getPrayerDisplayName(prayerName: string): string {
  const key = prayerName.toLowerCase();
  if (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(key)) {
    return i18n.t(`prayerNames.${key}`);
  }
  return prayerName;
}

/**
 * Get Turkish prayer name (legacy alias – now returns localized name)
 */
function getPrayerNameTurkish(prayerName: string): string {
  return getPrayerDisplayName(prayerName);
}

/** Android 8+: Ezan bildirimi için kanal gerekli (ses + titreşim). Her vakit kendi sesi için ayrı kanal. */
async function ensurePrayerTimeChannelsAndroid(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const NotificationsModule = getNotifications();
  if (!NotificationsModule?.setNotificationChannelAsync) return;

  const vibrationPattern = [0, 250, 250, 250];
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  for (const key of prayers) {
    const soundFile = PRAYER_SOUND_MAP[key];
    const channelId = `prayer_time_${key}`;
    const prayerDisplayName = getPrayerDisplayName(key);
    await NotificationsModule.setNotificationChannelAsync(channelId, {
      name: i18n.t('notification.prayerTimeTitle', { prayerName: prayerDisplayName }),
      importance: 5,
      sound: soundFile,
      vibrationPattern,
      enableVibration: true,
    } as any);
  }
}

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    const { debugLog } = require('@/lib/utils/debugLog');
    debugLog('NotificationService.ts:requestPermissions', 'entry', {});
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) {
      debugLog('NotificationService.ts:requestPermissions', 'Notifications module null', {});
      console.warn('[NotificationService] Notifications not available');
      return false;
    }

    try {
      configureNotifications(); // Ensure handler is set

      const { status: existingStatus } = await NotificationsModule.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await NotificationsModule.requestPermissionsAsync();
        finalStatus = status;
      }

      debugLog('NotificationService.ts:requestPermissions', 'done', { finalStatus });
      return finalStatus === 'granted';
    } catch (err) {
      debugLog('NotificationService.ts:requestPermissions', 'error', { error: String(err) });
      return false;
    }
  }

  /**
   * Schedule prayer time notifications for the next N days
   * @deprecated Use schedulePrayerTimeNotifications instead
   */
  async schedulePrayerNotifications(
    prayerTimes: Array<{
      date: string;
      prayers: Array<{ name: string; time: Date }>;
    }>,
    days: number = 7
  ): Promise<void> {
    return this.schedulePrayerTimeNotifications(prayerTimes, days);
  }

  /**
   * Schedule prayer time notifications (ezan notifications)
   */
  async schedulePrayerTimeNotifications(
    prayerTimes: Array<{
      date: string;
      prayers: Array<{ name: string; time: Date }>;
    }>,
    days: number = 7,
    soundEnabled: boolean = true,
    vibrationEnabled: boolean = true
  ): Promise<void> {
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) {
      console.warn('[NotificationService] Notifications not available');
      return;
    }

    configureNotifications(); // Ensure handler is set

    await ensurePrayerTimeChannelsAndroid();

    // Cancel existing prayer time notifications
    await this.cancelNotificationsByType('prayer_time');

    const vibrationPattern = [0, 250, 250, 250];

    // Schedule new notifications
    for (const day of prayerTimes.slice(0, days)) {
      for (const prayer of day.prayers) {
        const prayerKey = prayer.name.toLowerCase();
        if (!['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(prayerKey)) {
          continue;
        }

        if (prayer.time.getTime() <= Date.now()) {
          continue;
        }

        const prayerNameTurkish = getPrayerNameTurkish(prayer.name);
        const soundFile = soundEnabled ? getPrayerSound(prayer.name) : false;
        const channelId = Platform.OS === 'android' ? `prayer_time_${prayerKey}` : undefined;

        await NotificationsModule.scheduleNotificationAsync({
          content: {
            title: i18n.t('notification.prayerTimeTitle', { prayerName: prayerNameTurkish }),
            body: i18n.t('notification.prayerTimeBody', { prayerName: prayerNameTurkish }),
            sound: soundEnabled ? (soundFile || true) : false,
            vibrate: vibrationEnabled ? vibrationPattern : undefined,
            categoryIdentifier: NOTIFICATION_CATEGORIES.PRAYER_TIME,
            ...(channelId && { channelId }),
            data: {
              type: 'prayer_time',
              prayerName: prayer.name,
              prayerNameTurkish,
              date: day.date,
              deepLink: 'islamicapp://adhan',
            },
          },
          trigger: {
            type: 'date',
            date: prayer.time,
            ...(channelId && { channelId }),
          } as any,
        });
      }
    }
  }

  /**
   * Cancel all prayer time notifications
   * @deprecated Use cancelNotificationsByType instead
   */
  async cancelPrayerNotifications(): Promise<void> {
    return this.cancelNotificationsByType('prayer_time');
  }

  /**
   * Schedule pre-prayer alerts (15 minutes before prayer time)
   */
  async schedulePrePrayerAlerts(
    prayerTimes: Array<{
      date: string;
      prayers: Array<{ name: string; time: Date }>;
    }>,
    days: number = 7,
    vibrationEnabled: boolean = true
  ): Promise<void> {
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) {
      console.warn('[NotificationService] Notifications not available');
      return;
    }

    configureNotifications(); // Ensure handler is set

    await this.cancelNotificationsByType('pre_prayer');

    const PRE_PRAYER_MINUTES = 15;

    for (const day of prayerTimes.slice(0, days)) {
      for (const prayer of day.prayers) {
        const prayerKey = prayer.name.toLowerCase();
        if (!['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(prayerKey)) {
          continue;
        }

        const prayerNameTurkish = getPrayerNameTurkish(prayer.name);
        const alertTime = new Date(prayer.time);
        alertTime.setMinutes(alertTime.getMinutes() - PRE_PRAYER_MINUTES);

        if (alertTime.getTime() <= Date.now()) {
          continue;
        }

        await NotificationsModule.scheduleNotificationAsync({
          content: {
            title: i18n.t('notification.reminderTitle'),
            body: i18n.t('notification.prePrayerBody', { prayerName: prayerNameTurkish }),
            sound: true,
            vibrate: vibrationEnabled ? [0, 250, 250, 250] : undefined,
            categoryIdentifier: NOTIFICATION_CATEGORIES.PRE_PRAYER,
            data: {
              type: 'pre_prayer',
              prayerName: prayer.name,
              prayerNameTurkish,
              date: day.date,
              deepLink: 'islamicapp://adhan',
            },
          },
          trigger: {
            type: 'date',
            date: alertTime,
          } as any,
        });
      }
    }
  }

  /**
   * Schedule prayer STATUS notifications (15-20 minutes after prayer / ezan time).
   * Shows "Namazı kıldın mı?" with "Kıldım" and "Daha sonra hatırlat" action buttons.
   * Tapping the notification navigates to the index (home) screen.
   * todayDate + alreadyPrayedToday verilirse, bugün için "kıldım" işaretlenmiş vakitlerin bildirimi planlanmaz.
   */
  async schedulePrayerStatusNotifications(
    prayerTimes: Array<{
      date: string;
      prayers: Array<{ name: string; time: Date }>;
    }>,
    days: number = 7,
    vibrationEnabled: boolean = true,
    opts?: { todayDate: string; alreadyPrayedToday: Record<string, boolean> }
  ): Promise<void> {
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) {
      console.warn('[NotificationService] Notifications not available');
      return;
    }

    configureNotifications();

    await this.cancelNotificationsByType('prayer_status');

    // Random offset between 15-20 minutes to feel more natural
    const getStatusDelayMs = () => (15 + Math.floor(Math.random() * 6)) * 60 * 1000;

    for (const day of prayerTimes.slice(0, days)) {
      for (const prayer of day.prayers) {
        const prayerKey = prayer.name.toLowerCase();
        if (!['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(prayerKey)) {
          continue;
        }

        // Skip if already prayed today
        if (
          opts?.todayDate &&
          opts?.alreadyPrayedToday &&
          day.date === opts.todayDate &&
          opts.alreadyPrayedToday[prayerKey]
        ) {
          continue;
        }

        const prayerNameDisplay = getPrayerDisplayName(prayer.name);
        const statusTime = new Date(prayer.time.getTime() + getStatusDelayMs());

        if (statusTime.getTime() <= Date.now()) {
          continue;
        }

        await NotificationsModule.scheduleNotificationAsync({
          content: {
            title: i18n.t('notification.prayerStatusTitle', { prayerName: prayerNameDisplay }),
            body: i18n.t('notification.prayerStatusBody', { prayerName: prayerNameDisplay }),
            sound: true,
            vibrate: vibrationEnabled ? [0, 250, 250, 250] : undefined,
            categoryIdentifier: NOTIFICATION_CATEGORIES.PRAYER_STATUS,
            data: {
              type: 'prayer_status',
              prayerName: prayer.name,
              prayerNameDisplay,
              date: day.date,
              deepLink: 'islamicapp://index',
            },
          },
          trigger: {
            type: 'date',
            date: statusTime,
          } as any,
        });
      }
    }
  }

  /**
   * Schedule prayer LATE REMINDER notifications (1 hour after ezan time).
   * Only sent if the user has NOT yet marked the prayer as prayed.
   * Tapping navigates to the index (home) screen.
   */
  async schedulePrayerLateReminderNotifications(
    prayerTimes: Array<{
      date: string;
      prayers: Array<{ name: string; time: Date }>;
    }>,
    days: number = 7,
    vibrationEnabled: boolean = true,
    opts?: { todayDate: string; alreadyPrayedToday: Record<string, boolean> }
  ): Promise<void> {
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) {
      console.warn('[NotificationService] Notifications not available');
      return;
    }

    configureNotifications();

    await this.cancelNotificationsByType('prayer_late_reminder');

    const LATE_REMINDER_MS = 60 * 60 * 1000; // 1 hour

    for (const day of prayerTimes.slice(0, days)) {
      for (const prayer of day.prayers) {
        const prayerKey = prayer.name.toLowerCase();
        if (!['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(prayerKey)) {
          continue;
        }

        // Do NOT schedule if already prayed
        if (
          opts?.todayDate &&
          opts?.alreadyPrayedToday &&
          day.date === opts.todayDate &&
          opts.alreadyPrayedToday[prayerKey]
        ) {
          continue;
        }

        const prayerNameDisplay = getPrayerDisplayName(prayer.name);
        const lateReminderTime = new Date(prayer.time.getTime() + LATE_REMINDER_MS);

        if (lateReminderTime.getTime() <= Date.now()) {
          continue;
        }

        await NotificationsModule.scheduleNotificationAsync({
          content: {
            title: i18n.t('notification.prayerLateReminderTitle', { prayerName: prayerNameDisplay }),
            body: i18n.t('notification.prayerLateReminderBody', { prayerName: prayerNameDisplay }),
            sound: true,
            vibrate: vibrationEnabled ? [0, 250, 250, 250] : undefined,
            categoryIdentifier: NOTIFICATION_CATEGORIES.PRAYER_LATE_REMINDER,
            data: {
              type: 'prayer_late_reminder',
              prayerName: prayer.name,
              prayerNameDisplay,
              date: day.date,
              deepLink: 'islamicapp://index',
            },
          },
          trigger: {
            type: 'date',
            date: lateReminderTime,
          } as any,
        });
      }
    }
  }

  /**
   * Cancel the late reminder for a specific prayer (call when user marks prayer as prayed).
   */
  async cancelPrayerLateReminderForPrayer(prayerName: string, date: string): Promise<void> {
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) return;

    const notifications = await NotificationsModule.getAllScheduledNotificationsAsync();
    const key = prayerName.toLowerCase();
    const filtered = notifications.filter(
      (n) =>
        n.content.data?.type === 'prayer_late_reminder' &&
        (n.content.data?.prayerName as string)?.toLowerCase() === key &&
        n.content.data?.date === date
    );
    for (const notification of filtered) {
      await NotificationsModule.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  /**
   * Schedule prayer reminder notifications (30 minutes after prayer time).
   * @deprecated Use schedulePrayerStatusNotifications for the post-ezan "did you pray?" flow.
   * todayDate + alreadyPrayedToday verilirse, bugün için "kıldım" işaretlenmiş vakitlerin hatırlatması planlanmaz.
   */
  async schedulePrayerReminderNotifications(
    prayerTimes: Array<{
      date: string;
      prayers: Array<{ name: string; time: Date }>;
    }>,
    days: number = 7,
    vibrationEnabled: boolean = true,
    opts?: { todayDate: string; alreadyPrayedToday: Record<string, boolean> }
  ): Promise<void> {
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) {
      console.warn('[NotificationService] Notifications not available');
      return;
    }

    configureNotifications(); // Ensure handler is set

    await this.cancelNotificationsByType('prayer_reminder');

    for (const day of prayerTimes.slice(0, days)) {
      for (const prayer of day.prayers) {
        const prayerKey = prayer.name.toLowerCase();
        if (!['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(prayerKey)) {
          continue;
        }

        if (
          opts?.todayDate &&
          opts?.alreadyPrayedToday &&
          day.date === opts.todayDate &&
          opts.alreadyPrayedToday[prayerKey]
        ) {
          continue;
        }

        const prayerNameTurkish = getPrayerNameTurkish(prayer.name);
        const reminderTime = new Date(prayer.time);
        reminderTime.setMinutes(reminderTime.getMinutes() + 30);

        if (reminderTime.getTime() <= Date.now()) {
          continue;
        }

        await NotificationsModule.scheduleNotificationAsync({
          content: {
            title: i18n.t('notification.reminderTitle'),
            body: i18n.t('notification.reminderBody', { prayerName: prayerNameTurkish }),
            sound: true,
            vibrate: vibrationEnabled ? [0, 250, 250, 250] : undefined,
            categoryIdentifier: NOTIFICATION_CATEGORIES.PRAYER_REMINDER,
            data: {
              type: 'prayer_reminder',
              prayerName: prayer.name,
              prayerNameTurkish,
              date: day.date,
              deepLink: 'islamicapp://tracking',
            },
          },
          trigger: {
            type: 'date',
            date: reminderTime,
          } as any,
        });
      }
    }
  }

  /**
   * Schedule prayer reminder later notification (40 minutes before next prayer)
   */
  async schedulePrayerReminderLater(
    prayerName: string,
    nextPrayerTime: Date,
    date: string
  ): Promise<string | null> {
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) {
      console.warn('[NotificationService] Notifications not available');
      return null;
    }

    configureNotifications(); // Ensure handler is set

    const prayerNameTurkish = getPrayerNameTurkish(prayerName);
    const reminderTime = new Date(nextPrayerTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - 40);

    // Only schedule if reminder time is in the future
    if (reminderTime.getTime() <= Date.now()) {
      return null;
    }

    const notificationId = await NotificationsModule.scheduleNotificationAsync({
      content: {
        title: i18n.t('notification.reminderTitle'),
        body: i18n.t('notification.dontForgetBody', { prayerName: prayerNameTurkish }),
        sound: true,
        categoryIdentifier: NOTIFICATION_CATEGORIES.PRAYER_REMINDER_LATER,
        data: {
          type: 'prayer_reminder_later',
          prayerName,
          prayerNameTurkish,
          date,
          deepLink: 'islamicapp://adhan',
        },
      },
      trigger: {
        type: 'date' as const,
        date: reminderTime,
      } as any,
    });

    return notificationId;
  }

  /**
   * Schedule daily verse notification
   */
  async scheduleDailyVerseNotification(
    ayahNumber: number,
    surahNumber: number,
    ayahText: string,
    time: string // HH:mm format
  ): Promise<string | null> {
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) {
      console.warn('[NotificationService] Notifications not available');
      return null;
    }

    configureNotifications(); // Ensure handler is set

    // Cancel existing daily verse notifications
    await this.cancelNotificationsByType('daily_verse');

    // Parse time (HH:mm)
    const [hours, minutes] = time.split(':').map(Number);
    const notificationTime = new Date();
    notificationTime.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (notificationTime.getTime() <= Date.now()) {
      notificationTime.setDate(notificationTime.getDate() + 1);
    }

    const notificationId = await NotificationsModule.scheduleNotificationAsync({
      content: {
        title: i18n.t('notification.dailyVerseTitle'),
        body: ayahText.length > 100 ? `${ayahText.substring(0, 100)}...` : ayahText,
        sound: true,
        categoryIdentifier: NOTIFICATION_CATEGORIES.DAILY_VERSE,
        data: {
          type: 'daily_verse',
          ayahNumber,
          surahNumber,
          deepLink: 'islamicapp://more/daily-verse',
        },
      },
      trigger: {
        type: 'date' as const,
        date: notificationTime,
      } as any,
    });

    return notificationId;
  }

  /**
   * Schedule streak notification at 09:00 every day.
   * Shows: "Maşallah X gündür aralıksız namaz kılıyorsun. Böyle Devam. Allah kabul etsin."
   * Only scheduled if streakCount > 0.
   */
  async scheduleStreakNotification(
    streakCount: number,
    time: string = '09:00' // HH:mm format – defaults to 09:00
  ): Promise<string | null> {
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) {
      console.warn('[NotificationService] Notifications not available');
      return null;
    }

    configureNotifications(); // Ensure handler is set

    // Cancel existing streak notifications
    await this.cancelNotificationsByType('streak');

    // Only schedule if streak is > 0
    if (streakCount <= 0) {
      return null;
    }

    // Parse time (HH:mm)
    const [hours, minutes] = time.split(':').map(Number);
    const notificationTime = new Date();
    notificationTime.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (notificationTime.getTime() <= Date.now()) {
      notificationTime.setDate(notificationTime.getDate() + 1);
    }

    const notificationId = await NotificationsModule.scheduleNotificationAsync({
      content: {
        title: i18n.t('notification.streakTitle'),
        body: i18n.t('notification.streakBody', { count: streakCount }),
        sound: true,
        categoryIdentifier: NOTIFICATION_CATEGORIES.STREAK,
        data: {
          type: 'streak',
          count: streakCount,
          deepLink: 'islamicapp://tracking',
        },
      },
      trigger: {
        type: 'date' as const,
        date: notificationTime,
        repeats: true,
      } as any,
    });

    return notificationId;
  }

  /**
   * Schedule a one-time reminder 7 days from now: "You haven't been online for 7 days.
   * Connect for up-to-date prayer times." Call after every successful calendar fetch / upsertMonth;
   * cancels any existing reminder and reschedules for 7 days from now.
   */
  async scheduleStalePrayerTimesReminder(): Promise<string | null> {
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) {
      console.warn('[NotificationService] Notifications not available');
      return null;
    }

    configureNotifications();

    await this.cancelNotificationsByType('stale_prayer_times_reminder');

    const triggerDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const notificationId = await NotificationsModule.scheduleNotificationAsync({
      content: {
        title: i18n.t('notification.stalePrayerTimesTitle'),
        body: i18n.t('notification.stalePrayerTimesBody'),
        sound: true,
        data: {
          type: 'stale_prayer_times_reminder',
          deepLink: 'islamicapp://adhan',
        },
      },
      trigger: {
        type: 'date' as const,
        date: triggerDate,
      } as any,
    });

    return notificationId;
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) {
      return;
    }

    await NotificationsModule.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Cancel notification by identifier
   */
  async cancelNotificationByIdentifier(identifier: string): Promise<void> {
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) {
      return;
    }

    await NotificationsModule.cancelScheduledNotificationAsync(identifier);
  }

  /**
   * Cancel notifications by type
   */
  async cancelNotificationsByType(type: string): Promise<void> {
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) {
      return;
    }

    const notifications = await NotificationsModule.getAllScheduledNotificationsAsync();
    const filteredNotifications = notifications.filter(
      (n) => n.content.data?.type === type
    );

    for (const notification of filteredNotifications) {
      await NotificationsModule.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  /**
   * Sadece belirtilen (tarih, vakit) için namaz hatırlatıcı bildirimini iptal eder.
   * Kullanıcı "kıldım" işaretlediğinde o vakit hatırlatması gelmemeli.
   */
  async cancelPrayerReminderForPrayer(prayerName: string, date: string): Promise<void> {
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) return;

    const notifications = await NotificationsModule.getAllScheduledNotificationsAsync();
    const key = prayerName.toLowerCase();
    const filtered = notifications.filter(
      (n) =>
        n.content.data?.type === 'prayer_reminder' &&
        (n.content.data?.prayerName as string)?.toLowerCase() === key &&
        n.content.data?.date === date
    );
    for (const notification of filtered) {
      await NotificationsModule.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  /**
   * Register push notification token
   */
  async registerPushToken(): Promise<string | null> {
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) {
      console.warn('[NotificationService] Notifications not available');
      return null;
    }

    try {
      const token = await NotificationsModule.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '6437d0ae-1f94-41c8-9047-ade881444e1e',
      });
      return token.data;
    } catch (error) {
      console.error('Failed to register push token:', error);
      return null;
    }
  }

  /**
   * Register background task for critical operations
   */
  async registerBackgroundTask(): Promise<void> {
    loadNotificationModules();
    if (!BackgroundFetch) {
      console.warn('[NotificationService] BackgroundFetch not available');
      return;
    }

    try {
      await BackgroundFetch.registerTaskAsync('refresh-prayer-times', {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });
    } catch (error) {
      console.error('Background task registration failed:', error);
    }
  }

  /**
   * Handle notification response (when user taps notification)
   */
  async handleNotificationResponse(
    response: { notification: { request: { content: { data?: any } } }; actionIdentifier: string }
  ): Promise<void> {
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) {
      return;
    }
    const data = response.notification.request.content.data;
    const actionIdentifier = response.actionIdentifier;

    // Handle action button clicks
    if (actionIdentifier === NOTIFICATION_ACTIONS.PRAYER_MARKED_PRAYED) {
      const { prayerTrackingRepo } = await import('@/lib/database/sqlite/prayer-tracking/repository');
      const { getEffectiveToday } = await import('@/lib/services/prayerDate');

      if (data?.prayerName) {
        const prayerName = data.prayerName.toLowerCase() as PrayerName;
        const today = getEffectiveToday();
        const notifDate = typeof data?.date === 'string' ? data.date : today;

        // Mark as prayed in SQLite
        await prayerTrackingRepo.upsertPrayerState(notifDate, prayerName, 'prayed');

        // Cancel the late reminder too (user already prayed)
        await this.cancelPrayerReminderForPrayer(data.prayerName, notifDate);
        await this.cancelPrayerLateReminderForPrayer(data.prayerName, notifDate);
      }
      return;
    }

    if (actionIdentifier === NOTIFICATION_ACTIONS.PRAYER_REMIND_LATER) {
      // Schedule reminder for next prayer time
      // This will be handled by notificationScheduler
      return;
    }

    // Handle different notification types (when tapped, not action button)
    switch (data?.type) {
      case 'prayer_time':
        // Navigate to adhan screen via deep link
        // Deep link: islamicapp://adhan
        break;
      case 'prayer_status':
        // Navigate to index (home) screen
        // Deep link: islamicapp://index
        break;
      case 'prayer_late_reminder':
        // Navigate to index (home) screen
        // Deep link: islamicapp://index
        break;
      case 'daily_verse':
        // Navigate to daily verse screen
        // Deep link: islamicapp://daily-verse
        break;
      case 'prayer_reminder':
        // Navigate to prayer tracking screen (legacy)
        // Deep link: islamicapp://tracking
        break;
      case 'streak':
        // Navigate to tracking screen
        // Deep link: islamicapp://tracking
        break;
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();