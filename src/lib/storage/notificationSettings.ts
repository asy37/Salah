/**
 * Notification Settings Storage
 * Zustand store for notification preferences
 * Aligns with Settings screen toggles and NotificationService
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationSettings {
  // Namaz vakitleri bildirimleri (Adhan Notifications)
  adhanNotifications: boolean;
  prayerTimeSoundEnabled: boolean;

  // Namaz öncesi hatırlatma (15 dk önce)
  prePrayerAlerts: boolean;

  // Ses ve titreşim
  playAdhanAudio: boolean;
  vibration: boolean;

  // Namaz takip bildirimleri (30 dk sonra "... kıldın mı?")
  prayerReminderEnabled: boolean;

  // Günlük ayet bildirimleri
  dailyVerseEnabled: boolean;
  dailyVerseTime: string; // HH:mm format (örn: "09:00")

  // Streak bildirimleri
  streakEnabled: boolean;
  streakTime: string; // HH:mm format (örn: "09:00")
}

const defaultSettings: NotificationSettings = {
  adhanNotifications: true,
  prayerTimeSoundEnabled: true,
  prePrayerAlerts: false,
  playAdhanAudio: true,
  vibration: true,
  prayerReminderEnabled: true,
  dailyVerseEnabled: true,
  dailyVerseTime: '09:00',
  streakEnabled: true,
  streakTime: '09:00',
};

type NotificationSettingsState = NotificationSettings & {
  setAdhanNotifications: (enabled: boolean) => void;
  setPrayerTimeSoundEnabled: (enabled: boolean) => void;
  setPrePrayerAlerts: (enabled: boolean) => void;
  setPlayAdhanAudio: (enabled: boolean) => void;
  setVibration: (enabled: boolean) => void;
  setPrayerReminderEnabled: (enabled: boolean) => void;
  setDailyVerseEnabled: (enabled: boolean) => void;
  setDailyVerseTime: (time: string) => void;
  setStreakEnabled: (enabled: boolean) => void;
  setStreakTime: (time: string) => void;
  reset: () => void;
};

// Migration: map old keys to new
function migrateSettings(state: any): NotificationSettings {
  return {
    ...defaultSettings,
    ...state,
    adhanNotifications: state?.adhanNotifications ?? state?.prayerTimeNotificationsEnabled ?? defaultSettings.adhanNotifications,
    playAdhanAudio: state?.playAdhanAudio ?? state?.prayerTimeSoundEnabled ?? defaultSettings.playAdhanAudio,
    prePrayerAlerts: state?.prePrayerAlerts ?? defaultSettings.prePrayerAlerts,
    vibration: state?.vibration ?? defaultSettings.vibration,
  };
}

export const useNotificationSettings = create<NotificationSettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setAdhanNotifications: (enabled) =>
        set({ adhanNotifications: enabled }),

      setPrayerTimeSoundEnabled: (enabled) =>
        set({ prayerTimeSoundEnabled: enabled }),

      setPrePrayerAlerts: (enabled) =>
        set({ prePrayerAlerts: enabled }),

      setPlayAdhanAudio: (enabled) =>
        set({ playAdhanAudio: enabled }),

      setVibration: (enabled) =>
        set({ vibration: enabled }),

      setPrayerReminderEnabled: (enabled) =>
        set({ prayerReminderEnabled: enabled }),

      setDailyVerseEnabled: (enabled) =>
        set({ dailyVerseEnabled: enabled }),

      setDailyVerseTime: (time) =>
        set({ dailyVerseTime: time }),

      setStreakEnabled: (enabled) =>
        set({ streakEnabled: enabled }),

      setStreakTime: (time) =>
        set({ streakTime: time }),

      reset: () => set(defaultSettings),
    }),
    {
      name: 'notification-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persistedState: unknown, version: number): NotificationSettings => {
        if (version < 2) {
          return migrateSettings(persistedState);
        }
        if (persistedState != null && typeof persistedState === 'object') {
          return { ...defaultSettings, ...persistedState } as NotificationSettings;
        }
        return defaultSettings;
      },
    }
  )
);
