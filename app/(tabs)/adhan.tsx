import { ScrollView, View, Text } from "react-native";
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
import { useTranslation } from "@/i18n";

export default function AdhanScreen() {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const todayData = usePrayerTimesStore((state) => state.getTodayData());

  const prayerDate = todayData?.date as PrayerDate | undefined;
  const prayerTimings = todayData?.timings as PrayerTimings | undefined;
  const hasData = todayData?.timings != null;

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
        {hasData ? (
          <>
            <DateInfo isDark={isDark} data={prayerDate!} />
            <NextPrayerCard isDark={isDark} data={prayerTimings} />
            <PrayerScheduleList
              prayerMap={adhanMap}
              isDark={isDark}
              data={prayerTimings}
              extended={false}
            />
          </>
        ) : (
          <View className="flex-1 items-center justify-center px-6 py-12">
            <Text
              className={clsx(
                "text-base text-center",
                isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
              )}
            >
              {t("adhan.offlineMessage")}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
