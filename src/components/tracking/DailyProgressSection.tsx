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

type DailyProgressSectionProps = {
  readonly data: PrayerTrackingData;
};

export default function DailyProgressSection({
  data,
}: DailyProgressSectionProps) {
  const { isDark } = useTheme();

  const prayerTimesData = usePrayerTimesStore((state) => state.cache);

  return (
    <View className="mt-6">
      <View className="flex-row items-center justify-between mb-4 px-1">
        <Text
          className={clsx(
            "text-lg font-bold",
            isDark ? "text-text-primaryDark" : "text-text-primaryLight"
          )}
        >
          Günlük Namazlar
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
        <PrayerList
          extended={true}
          isDark={isDark}
          data={prayerTimesData?.data.timings}
          prayerMap={prayerMap}
        />
      </View>
    </View>
  );
}
