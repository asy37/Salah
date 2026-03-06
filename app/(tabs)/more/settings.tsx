import { ScrollView, View, Text, Alert, I18nManager } from "react-native";
import clsx from "clsx";
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
import { fetchPrayerTimes, fetchPrayerTimesCalendar } from "@/lib/api/services/prayerTimes";
import type { PrayerTimesDayData } from "@/lib/api/services/prayerTimes";
import { getMonth, upsertMonth } from "@/lib/database/sqlite/prayer-times/repository";
import { useMethodStore } from "@/lib/storage/useMethodStore";
import { queryClient } from "@/lib/query/queryClient";
import { queryKeys } from "@/lib/query/queryKeys";
import { syncPushTokenAndSettings } from "@/lib/services/pushTokenSync";
import { getTodayDDMMYYYY } from "@/lib/services/dailyReset";
import { useTheme } from "@/lib/storage/useThemeStore";
import CalculationMethodModal from "@/components/adhan/CalculationMethodModal";
import { PrayerCalculationMethod } from "@/constants/prayer-method";
import { useTranslation } from "@/i18n";
import { setStoredLanguage } from "@/i18n/localeStorage";
import type { SupportedLocale } from "@/i18n/localeStorage";


export default function SettingsScreen() {
  const { isDark } = useTheme();
  const { t, i18n: i18nInstance } = useTranslation();
  const currentLang = (i18nInstance.language?.split(/[-_]/)[0] ?? "tr") as string;
  const effectiveLang: SupportedLocale = currentLang === "en" || currentLang === "tr" || currentLang === "ar" ? currentLang : "tr";
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
    import("expo-notifications")
      .then((Notifications) =>
        Notifications.getPermissionsAsync().then(({ status }) => {
          setNotificationPermission(status === "granted");
        })
      )
      .catch(() => setNotificationPermission(null));
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
        const today = getTodayDDMMYYYY();
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        // Önce SQLite’daki aylık cache’ten 7 gün al (sistem: aylık Aladhan → SQLite → offline kullanım)
        let monthData = await getMonth(year, month, lat, lng, method);
        if (!monthData?.length) {
          try {
            const cal = await fetchPrayerTimesCalendar({
              latitude: lat,
              longitude: lng,
              method,
              year,
              month,
            });
            await upsertMonth(year, month, lat, lng, method, cal.data);
            monthData = cal.data;
          } catch {
            /* offline veya API hatası */
          }
        }

        const dayIndex = monthData?.findIndex((d) => d.date?.gregorian?.date === today) ?? -1;
        const weekData: PrayerTimesDayData[] =
          dayIndex >= 0 && monthData
            ? monthData.slice(dayIndex, dayIndex + 7).map((d) => ({
                date: d.date?.gregorian?.date ?? "",
                data: d,
              }))
            : [];

        if (weekData.length > 0) {
          await notificationScheduler.scheduleAllNotificationsFromWeek(weekData);
        } else {
          const res = await fetchPrayerTimes({
            latitude: lat,
            longitude: lng,
            method,
            date: today,
          });
          await notificationScheduler.scheduleAllNotifications(res, 7);
        }
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

  const handleLanguageSelect = (code: SupportedLocale) => {
    const isRTL = code === "ar";
    const wasRTL = I18nManager.isRTL;
    i18nInstance.changeLanguage(code);
    setStoredLanguage(code);
    if (isRTL !== wasRTL) {
      I18nManager.forceRTL(isRTL);
      Alert.alert(t("language.restartMessage"));
    }
  };

  const showLanguagePicker = () => {
    Alert.alert(
      t("language.sectionTitle"),
      undefined,
      [
        { text: t("language.en"), onPress: () => handleLanguageSelect("en") },
        { text: t("language.tr"), onPress: () => handleLanguageSelect("tr") },
        { text: t("language.ar"), onPress: () => handleLanguageSelect("ar") },
        { text: t("common.cancel"), style: "cancel" },
      ]
    );
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
          <SettingsSection title={t("settings.prayerAndLocation")} isDark={isDark} />
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
              title={t("settings.calculationMethod")}
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
              title={t("settings.autoLocation")}
              subtitle={t("settings.autoLocationSubtitle")}
              value={autoLocation}
              onValueChange={(v) => setAutoLocation(v)}
              isDark={isDark}
            />
          </View>

          {/* Notifications */}
          <SettingsSection title={t("settings.notifications")} isDark={isDark} />
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
                  {t("settings.notificationsOff")}
                </Text>
              </View>
            )}
            <SettingsToggle
              title={t("settings.adhanNotifications")}
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
              title={t("settings.prePrayerAlerts")}
              subtitle={t("settings.prePrayerSubtitle")}
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
              title={t("settings.dailyVerseNotification")}
              subtitle={t("settings.dailyVerseSubtitle")}
              value={dailyVerseEnabled}
              onValueChange={(v) => handleToggleChange(setDailyVerseEnabled, v, "dailyVerse")}
              isDark={isDark}
            />
          </View>

          {/* Sound & Haptics */}
          <SettingsSection title={t("settings.soundAndHaptics")} isDark={isDark} />
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
              title={t("settings.playAdhanAudio")}
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
              title={t("settings.vibration")}
              value={vibration}
              onValueChange={(v) => handleToggleChange(setVibration, v, "vibration")}
              isDark={isDark}
            />
          </View>

          {/* Appearance */}
          <SettingsSection title={t("settings.appearance")} isDark={isDark} />
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
            <View
              className="h-px"
              style={{
                backgroundColor: isDark
                  ? "rgba(34, 56, 51, 0.5)"
                  : "#E2ECE8",
              }}
            />
            <SettingsItem
              title={t("settings.language")}
              value={t(`language.${effectiveLang}`)}
              isDark={isDark}
              onPress={showLanguagePicker}
            />
          </View>

          {/* Support & About - keep section title key */}
          <SettingsSection title={t("settings.supportAndAbout")} isDark={isDark} />
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
              title={t("settings.helpCenter")}
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
              title={t("settings.privacyPolicy")}
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
              title={t("settings.rateTheApp")}
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

