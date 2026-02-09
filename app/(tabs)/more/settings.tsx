import { ScrollView, View, Text } from "react-native";
import clsx from "clsx";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import SettingsHeader from "@/components/settings/SettingsHeader";
import SettingsSection from "@/components/settings/SettingsSection";
import SettingsItem from "@/components/settings/SettingsItem";
import SettingsToggle from "@/components/settings/SettingsToggle";
import ThemeSelector from "@/components/settings/ThemeSelector";
import VersionInfo from "@/components/settings/VersionInfo";
import { useNotificationSettings } from "@/lib/storage/notificationSettings";
import { useLocationStore } from "@/lib/storage/locationStore";
import { notificationScheduler } from "@/lib/services/notificationScheduler";
import { fetchPrayerTimes } from "@/lib/api/services/prayerTimes";
import { useMethodStore } from "@/lib/storage/useMethodStore";
import { queryClient } from "@/lib/query/queryClient";
import { queryKeys } from "@/lib/query/queryKeys";
import { syncPushTokenAndSettings } from "@/lib/services/pushTokenSync";
import { useTheme } from "@/lib/storage/useThemeStore";
import CalculationMethodModal from "@/components/adhan/CalculationMethodModal";
import { PrayerCalculationMethod } from "@/constants/prayer-method";


export default function SettingsScreen() {
  const { isDark } = useTheme();
  const [showCalculationMethodModal, setShowCalculationMethodModal] =
    useState(false);
  const setMethod = useMethodStore((state) => state.setMethod);
  const method = useMethodStore((state) => state.method);

  const [notificationPermission, setNotificationPermission] = useState<boolean | null>(null);

  const autoLocation = useLocationStore((s) => s.autoLocation);
  const setAutoLocation = useLocationStore((s) => s.setAutoLocation);

  const adhanNotifications = useNotificationSettings((s) => s.adhanNotifications);
  const setAdhanNotifications = useNotificationSettings((s) => s.setAdhanNotifications);
  const prePrayerAlerts = useNotificationSettings((s) => s.prePrayerAlerts);
  const setPrePrayerAlerts = useNotificationSettings((s) => s.setPrePrayerAlerts);
  const playAdhanAudio = useNotificationSettings((s) => s.playAdhanAudio);
  const setPlayAdhanAudio = useNotificationSettings((s) => s.setPlayAdhanAudio);
  const vibration = useNotificationSettings((s) => s.vibration);
  const setVibration = useNotificationSettings((s) => s.setVibration);
  const dailyVerseEnabled = useNotificationSettings((s) => s.dailyVerseEnabled);
  const setDailyVerseEnabled = useNotificationSettings((s) => s.setDailyVerseEnabled);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotificationPermission(status === "granted");
    });
  }, []);

  const handleToggleChange = async (
    setter: (v: boolean) => void,
    value: boolean,
    key: string
  ) => {
    setter(value);
    if (key === "adhan" || key === "prePrayer" || key === "playAdhan" || key === "vibration" || key === "dailyVerse") {
      try {
        const method = useMethodStore.getState().method?.id ?? 13;
        const location = useLocationStore.getState().location;
        const lat = location?.latitude ?? 41.0082;
        const lng = location?.longitude ?? 28.9784;
        const res = await fetchPrayerTimes({
          latitude: lat,
          longitude: lng,
          method,
        });
        await notificationScheduler.scheduleAllNotifications(res, 7);
        queryClient.invalidateQueries({ queryKey: queryKeys.prayerTimes.all });
        syncPushTokenAndSettings();
      } catch (e) {
        console.error("[Settings] Reschedule failed:", e);
      }
    }
  };

  const handleSelectCalculationMethod = () => {
    setShowCalculationMethodModal(true);
  };

  const handleCalculationMethodSelect = (method: PrayerCalculationMethod) => {
    setMethod(method);
    setShowCalculationMethodModal(false);
  };
  return (
    <View
      className={clsx(
        "flex-1",
        isDark ? "bg-background-dark" : "bg-background-light"
      )}
    >
      <SettingsHeader isDark={isDark} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 py-2">
          {/* Prayer & Location */}
          <SettingsSection title="Prayer & Location" isDark={isDark} />
          <View
            className={clsx(
              "rounded-xl overflow-hidden",
              isDark ? "bg-background-cardDark" : "bg-background-cardLight"
            )}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <SettingsItem
              title="Calculation Method"
              value={method?.label ?? "Diyanet"}
              isDark={isDark}
              onPress={handleSelectCalculationMethod}
            />

            <View
              className="h-px"
              style={{
                backgroundColor: isDark
                  ? "rgba(34, 56, 51, 0.5)"
                  : "#E2ECE8",
              }}
            />
            <SettingsToggle
              title="Auto Location"
              subtitle="Use GPS for accurate times"
              value={autoLocation}
              onValueChange={(v) => setAutoLocation(v)}
              isDark={isDark}
            />
          </View>

          {/* Notifications */}
          <SettingsSection title="Notifications" isDark={isDark} />
          <View
            className={clsx(
              "rounded-xl overflow-hidden",
              isDark ? "bg-background-cardDark" : "bg-background-cardLight"
            )}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            {notificationPermission === false && (
              <View className="px-4 py-2">
                <Text
                  className={clsx(
                    "text-sm",
                    isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
                  )}
                >
                  Bildirimler kapalı. Sistem ayarlarından açabilirsiniz.
                </Text>
              </View>
            )}
            <SettingsToggle
              title="Adhan Notifications"
              value={adhanNotifications}
              onValueChange={(v) => handleToggleChange(setAdhanNotifications, v, "adhan")}
              isDark={isDark}
            />
            <View
              className="h-px"
              style={{
                backgroundColor: isDark
                  ? "rgba(34, 56, 51, 0.5)"
                  : "#E2ECE8",
              }}
            />
            <SettingsToggle
              title="Pre-Prayer Alerts"
              subtitle="Remind 15 mins before"
              value={prePrayerAlerts}
              onValueChange={(v) => handleToggleChange(setPrePrayerAlerts, v, "prePrayer")}
              isDark={isDark}
            />
            <View
              className="h-px"
              style={{
                backgroundColor: isDark
                  ? "rgba(34, 56, 51, 0.5)"
                  : "#E2ECE8",
              }}
            />
            <SettingsToggle
              title="Daily Verse Notification"
              subtitle="Günlük rastgele ayet bildirimi"
              value={dailyVerseEnabled}
              onValueChange={(v) => handleToggleChange(setDailyVerseEnabled, v, "dailyVerse")}
              isDark={isDark}
            />
          </View>

          {/* Sound & Haptics */}
          <SettingsSection title="Sound & Haptics" isDark={isDark} />
          <View
            className={clsx(
              "rounded-xl overflow-hidden",
              isDark ? "bg-background-cardDark" : "bg-background-cardLight"
            )}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <SettingsToggle
              title="Play Adhan Audio"
              value={playAdhanAudio}
              onValueChange={(v) => handleToggleChange(setPlayAdhanAudio, v, "playAdhan")}
              isDark={isDark}
            />
            <View
              className="h-px"
              style={{
                backgroundColor: isDark
                  ? "rgba(34, 56, 51, 0.5)"
                  : "#E2ECE8",
              }}
            />
            <SettingsToggle
              title="Vibration"
              value={vibration}
              onValueChange={(v) => handleToggleChange(setVibration, v, "vibration")}
              isDark={isDark}
            />
          </View>

          {/* Appearance */}
          <SettingsSection title="Appearance" isDark={isDark} />
          <View
            className={clsx(
              "rounded-xl overflow-hidden",
              isDark ? "bg-background-cardDark" : "bg-background-cardLight"
            )}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <ThemeSelector />
          </View>

          {/* Support & About */}
          <SettingsSection title="Support & About" isDark={isDark} />
          <View
            className={clsx(
              "rounded-xl overflow-hidden",
              isDark ? "bg-background-cardDark" : "bg-background-cardLight"
            )}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <SettingsItem
              title="Help Center"
              isDark={isDark}
              onPress={() => { }}
            />
            <View
              className="h-px"
              style={{
                backgroundColor: isDark
                  ? "rgba(34, 56, 51, 0.5)"
                  : "#E2ECE8",
              }}
            />
            <SettingsItem
              title="Privacy Policy"
              isDark={isDark}
              onPress={() => { }}
            />
            <View
              className="h-px"
              style={{
                backgroundColor: isDark
                  ? "rgba(34, 56, 51, 0.5)"
                  : "#E2ECE8",
              }}
            />
            <SettingsItem
              title="Rate the App"
              isDark={isDark}
              isPrimary
              onPress={() => { }}
            />
          </View>

          <VersionInfo isDark={isDark} />
        </View>
      </ScrollView>
      <CalculationMethodModal
        visible={showCalculationMethodModal}
        onClose={() => setShowCalculationMethodModal(false)}
        onSelect={handleCalculationMethodSelect}
      />
    </View>
  );
}

