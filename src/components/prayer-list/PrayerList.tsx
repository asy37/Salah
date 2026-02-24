import clsx from "clsx";
import { Text, View } from "react-native";
import PrayerScheduleItem from "./PrayerItem";
import { PrayerTimings } from "./types/prayer-timings";
import { getPrayerStatus, transformPrayerTimings } from "./utils/utils";
import { useTranslation } from "@/i18n";

type PrayerListProps = {
  readonly isDark: boolean;
  readonly extended?: boolean;
  readonly data: PrayerTimings | undefined;
  readonly prayerMap: Record<
    string,
    { name: string; key: string; meaning: string; icon: string }
  >;
};

export default function PrayerList({
  isDark,
  data,
  prayerMap,
  extended,
}: PrayerListProps) {
  const { t } = useTranslation();
  const prayerItems = transformPrayerTimings(prayerMap, data);

  return (
    <View className="flex-1 px-4 flex-col gap-3">
      <Text
        className={clsx(
          "text-lg font-semibold px-2 mb-1",
          isDark ? "text-text-primaryDark" : "text-text-primaryLight"
        )}
      >
        {t("prayer.todaySchedule")}
      </Text>
      {prayerItems.map((prayer) => {
        const { isPast, isActive } = getPrayerStatus(prayer.key, prayerItems);
        return (
          <PrayerScheduleItem
            extended={extended}
            key={prayer.key}
            prayer={prayer}
            isDark={isDark}
            isPast={isPast}
            isActive={isActive}
          />
        );
      })}
      <View className="h-8" />
    </View>
  );
}
