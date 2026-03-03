/**
 * Daily Progress Section
 * Shows prayer statuses and completion percentage
 */

import { View, Text } from "react-native";
import clsx from "clsx";
import type { PrayerTrackingData } from "@/types/prayer-tracking";
import { usePrayerTimesStore } from "@/lib/storage/prayerTimesStore";
import PrayerList from "@/components/prayer-list/PrayerList";
import { prayerMap } from "./utils";
import { useTheme } from "@/lib/storage/useThemeStore";
import { useTranslation } from "@/i18n";

type DailyProgressSectionProps = {
  readonly data: PrayerTrackingData;
};

export default function DailyProgressSection({
  data,
}: DailyProgressSectionProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const todayData = usePrayerTimesStore((state) => state.getTodayData());

  return (
    <View className="mt-6">
      <View className="flex-row items-center justify-between mb-4 px-1">
        <Text
          className={clsx(
            "text-lg font-bold",
            isDark ? "text-text-primaryDark" : "text-text-primaryLight"
          )}
        >
          {t("prayer.dailyPrayers")}
        </Text>
        <Text
          className={clsx(
            "text-sm font-medium",
            isDark ? "text-primary-400" : "text-primary-600"
          )}
        >
          %{data.percent}
        </Text>
      </View>

      <View className="gap-3">
        {todayData?.timings ? (
          <PrayerList
            extended={true}
            isDark={isDark}
            data={todayData.timings}
            prayerMap={prayerMap}
          />
        ) : (
          <Text
            className={clsx(
              "text-sm text-center py-4 px-2",
              isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
            )}
          >
            {t("prayer.offlineMessage")}
          </Text>
        )}
      </View>
    </View>
  );
}
