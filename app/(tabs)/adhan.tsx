import { ScrollView, View } from "react-native";
import clsx from "clsx";
import AdhanHeader from "@/components/adhan/AdhanHeader";
import DateInfo from "@/components/adhan/DateInfo";
import NextPrayerCard from "@/components/adhan/NextPrayerCard";
import PrayerScheduleList from "@/components/prayer-list/PrayerList";
import { PrayerDate } from "@/components/adhan/types/date-info";
import { PrayerTimings } from "@/components/prayer-list/types/prayer-timings";

import { usePrayerTimesStore } from "@/lib/storage/prayerTimesStore";
import { adhanMap } from "@/components/adhan/utils/utils-function";
import { useTheme } from "@/lib/storage/useThemeStore";

export default function AdhanScreen() {
  const { isDark } = useTheme();

  const data = usePrayerTimesStore((state) => state.cache);

  const prayerDate = data?.data.date as PrayerDate;
  const prayerTimings = data?.data.timings as PrayerTimings;

  return (
    <View
      className={clsx(
        "flex-1",
        isDark ? "bg-background-dark" : "bg-background-light"
      )}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <AdhanHeader isDark={isDark} />
        <DateInfo isDark={isDark} data={prayerDate} />
        <NextPrayerCard isDark={isDark} data={prayerTimings} />
        <PrayerScheduleList
          prayerMap={adhanMap}
          isDark={isDark}
          data={prayerTimings}
          extended={false}
        />
      </ScrollView>
    </View>
  );
}
