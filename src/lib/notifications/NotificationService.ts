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

import type { PrayerName } from '@/types/prayer-tracking';
import { Platform } from 'react-native';

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

// Prayer sound file mappings
const PRAYER_SOUND_MAP: Record<string, string> = {
  Fajr: 'fajr-ezan.mp3',
  Dhuhr: 'dhuhr-ezan.mp3',
  Asr: 'asr-ezan.mp3',
  Maghrib: 'maghrib-ezan.mp3',
  Isha: 'isha-ezan.mp3',
  fajr: 'fajr-ezan.mp3',
  dhuhr: 'dhuhr-ezan.mp3',
  asr: 'asr-ezan.mp3',
  maghrib: 'maghrib-ezan.mp3',
  isha: 'isha-ezan.mp3',
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
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) {
      console.warn('[NotificationService] Notifications not available');
      return false;
    }

    configureNotifications(); // Ensure handler is set

    const { status: existingStatus } = await NotificationsModule.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await NotificationsModule.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
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
    soundEnabled: boolean = true
  ): Promise<void> {
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) {
      console.warn('[NotificationService] Notifications not available');
      return;
    }

    configureNotifications(); // Ensure handler is set

    // Cancel existing prayer time notifications
    await this.cancelNotificationsByType('prayer_time');

    // Schedule new notifications
    for (const day of prayerTimes.slice(0, days)) {
      for (const prayer of day.prayers) {
        // Only schedule for actual prayer times (not Imsak, Sunrise, etc.)
        const prayerKey = prayer.name.toLowerCase();
        if (!['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(prayerKey)) {
          continue;
        }

        // Skip past times (iOS can assert on past date triggers)
        if (prayer.time.getTime() <= Date.now()) {
          continue;
        }

        const prayerNameTurkish = getPrayerNameTurkish(prayer.name);
        const soundFile = soundEnabled ? getPrayerSound(prayer.name) : false;
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:225',message:'Before scheduling prayer notification',data:{prayerName:prayer.name,prayerTime:prayer.time.toString(),prayerTimeType:typeof prayer.time,soundFile},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        const triggerObj = {
          type: 'date',
          date: prayer.time,
        };
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:232',message:'Trigger object created',data:{triggerObj:JSON.stringify(triggerObj),hasType:!!triggerObj.type,hasDate:!!triggerObj.date},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        await NotificationsModule.scheduleNotificationAsync({
          content: {
            title: `${prayerNameTurkish} Namazı Vakti`,
            body: `${prayerNameTurkish} namazı için ezan okundu`,
            sound: soundFile,
            categoryIdentifier: NOTIFICATION_CATEGORIES.PRAYER_TIME,
            data: {
              type: 'prayer_time',
              prayerName: prayer.name,
              prayerNameTurkish,
              date: day.date,
            },
          },
          trigger: triggerObj as any,
        });
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:252',message:'After scheduling prayer notification',data:{prayerName:prayer.name,success:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
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
   * Schedule prayer reminder notifications (30 minutes after prayer time)
   */
  async schedulePrayerReminderNotifications(
    prayerTimes: Array<{
      date: string;
      prayers: Array<{ name: string; time: Date }>;
    }>,
    days: number = 7
  ): Promise<void> {
    const NotificationsModule = getNotifications();
    if (!NotificationsModule) {
      console.warn('[NotificationService] Notifications not available');
      return;
    }

    configureNotifications(); // Ensure handler is set

    // Cancel existing reminder notifications
    await this.cancelNotificationsByType('prayer_reminder');

    // Schedule new notifications
    for (const day of prayerTimes.slice(0, days)) {
      for (const prayer of day.prayers) {
        // Only schedule for actual prayer times
        const prayerKey = prayer.name.toLowerCase();
        if (!['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(prayerKey)) {
          continue;
        }

        const prayerNameTurkish = getPrayerNameTurkish(prayer.name);
        const reminderTime = new Date(prayer.time);
        reminderTime.setMinutes(reminderTime.getMinutes() + 30);

        // Only schedule if reminder time is in the future
        if (reminderTime.getTime() <= Date.now()) {
          continue;
        }

        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationService.ts:290',message:'Before scheduling reminder notification',data:{prayerName:prayer.name,reminderTime:reminderTime.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        const reminderTrigger = {
          type: 'date',
          date: reminderTime,
        };

        await NotificationsModule.scheduleNotificationAsync({
          content: {
            title: 'Namaz Hatırlatıcı',
            body: `${prayerNameTurkish} namazını kıldın mı?`,
            sound: true,
            categoryIdentifier: NOTIFICATION_CATEGORIES.PRAYER_REMINDER,
            data: {
              type: 'prayer_reminder',
              prayerName: prayer.name,
              prayerNameTurkish,
              date: day.date,
            },
          },
          trigger: reminderTrigger as any,
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
          deepLink: 'islamicapp://daily-verse',
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
        projectId: 'your-project-id', // TODO: Replace with actual project ID
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
      // Mark prayer as prayed in SQLite
      const { prayerTrackingRepo } = await import('@/lib/database/sqlite/prayer-tracking/repository');
      const { getTodayDateString } = await import('@/lib/services/dailyReset');
      
      if (data?.prayerName) {
        const prayerName = data.prayerName.toLowerCase() as PrayerName;
        const today = getTodayDateString();
        await prayerTrackingRepo.upsertPrayerState(today, prayerName, 'prayed');
        
        // Cancel related reminder notifications
        await this.cancelNotificationsByType('prayer_reminder');
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

