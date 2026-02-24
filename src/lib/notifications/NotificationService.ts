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

// Conditional import for Expo Go compatibility
// Use lazy loading to avoid errors in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;
let TaskManager: typeof import('expo-task-manager') | null = null;
let BackgroundFetch: typeof import('expo-background-fetch') | null = null;

// Prayer name mappings
const PRAYER_NAME_MAP: Record<string, string> = {
  Fajr: 'Sabah',
  Dhuhr: 'Öğle',
  Asr: 'İkindi',
  Maghrib: 'Akşam',
  Isha: 'Yatsı',
  fajr: 'Sabah',
  dhuhr: 'Öğle',
  asr: 'İkindi',
  maghrib: 'Akşam',
  isha: 'Yatsı',
};

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
    NotificationsModule.setNotificationCategoryAsync(
      NOTIFICATION_CATEGORIES.PRAYER_REMINDER,
      [
        {
          identifier: NOTIFICATION_ACTIONS.PRAYER_MARKED_PRAYED,
          buttonTitle: 'Kıldım',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: NOTIFICATION_ACTIONS.PRAYER_REMIND_LATER,
          buttonTitle: 'Daha Sonra Hatırlat',
          options: {
            opensAppToForeground: false,
          },
        },
      ]
    );
  }
}

/**
 * Get Turkish prayer name
 */
function getPrayerNameTurkish(prayerName: string): string {
  return PRAYER_NAME_MAP[prayerName] || prayerName;
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
    await NotificationsModule.setNotificationChannelAsync(channelId, {
      name: `${PRAYER_NAME_MAP[key]} Namazı`,
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
            title: `${prayerNameTurkish} Namazı Vakti`,
            body: `${prayerNameTurkish} namazı için ezan okundu`,
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
            title: 'Namaz Hatırlatıcı',
            body: `${prayerNameTurkish} namazına 15 dakika kaldı`,
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
   * Schedule prayer reminder notifications (30 minutes after prayer time).
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
            title: 'Namaz Hatırlatıcı',
            body: `${prayerNameTurkish} namazını kıldın mı?`,
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
        title: 'Namaz Hatırlatıcı',
        body: `${prayerNameTurkish} namazını kılmayı unutma`,
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
        title: 'Günlük Ayet',
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
   * Schedule streak notification
   */
  async scheduleStreakNotification(
    streakCount: number,
    time: string // HH:mm format
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
        title: 'Namaz Serisi',
        body: `${streakCount} gündür aralıksız namaz kılıyorsun! 🎉`,
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
      const { getTodayDateString } = await import('@/lib/services/dailyReset');

      if (data?.prayerName) {
        const prayerName = data.prayerName.toLowerCase() as PrayerName;
        const today = getTodayDateString();
        await prayerTrackingRepo.upsertPrayerState(today, prayerName, 'prayed');

        const notifDate = typeof data?.date === 'string' ? data.date : today;
        await this.cancelPrayerReminderForPrayer(data.prayerName, notifDate);
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
        // Navigate to prayer times screen
        // TODO: Implement navigation via deep linking
        break;
      case 'daily_verse':
        // Navigate to daily verse screen
        // Deep link: islamicapp://daily-verse
        break;
      case 'prayer_reminder':
        // Navigate to prayer tracking screen
        // TODO: Implement navigation
        break;
      case 'streak':
        // Navigate to tracking screen
        // TODO: Implement navigation
        break;
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

