/**
 * Notification Settings Storage
 * Zustand store for notification preferences
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotificationSettings {
  // Namaz vakitleri bildirimleri
  prayerTimeNotificationsEnabled: boolean;
  prayerTimeSoundEnabled: boolean;
  
  // Namaz takip bildirimleri
  prayerReminderEnabled: boolean;
  
  // Günlük ayet bildirimleri
  dailyVerseEnabled: boolean;
  dailyVerseTime: string; // HH:mm format (örn: "09:00")
  
  // Streak bildirimleri
  streakEnabled: boolean;
  streakTime: string; // HH:mm format (örn: "08:00")
}

const defaultSettings: NotificationSettings = {
  prayerTimeNotificationsEnabled: true,
  prayerTimeSoundEnabled: true,
  prayerReminderEnabled: true,
  dailyVerseEnabled: true,
  dailyVerseTime: '09:00',
  streakEnabled: true,
  streakTime: '08:00',
};

type NotificationSettingsState = NotificationSettings & {
  setPrayerTimeNotificationsEnabled: (enabled: boolean) => void;
  setPrayerTimeSoundEnabled: (enabled: boolean) => void;
  setPrayerReminderEnabled: (enabled: boolean) => void;
  setDailyVerseEnabled: (enabled: boolean) => void;
  setDailyVerseTime: (time: string) => void;
  setStreakEnabled: (enabled: boolean) => void;
  setStreakTime: (time: string) => void;
  reset: () => void;
};

export const useNotificationSettings = create<NotificationSettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      
      setPrayerTimeNotificationsEnabled: (enabled) =>
        set({ prayerTimeNotificationsEnabled: enabled }),
      
      setPrayerTimeSoundEnabled: (enabled) =>
        set({ prayerTimeSoundEnabled: enabled }),
      
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
    }
  )
);
