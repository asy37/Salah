import { MaterialIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import type { PrayerWithTime } from "@/types/prayer-tracking";
import { useTheme } from "@/lib/storage/useThemeStore";

type UpcomingPrayerRowProps = {
  readonly prayer: PrayerWithTime;
};

export default function UpcomingPrayerRow({ prayer }: UpcomingPrayerRowProps) {
  const { isDark } = useTheme();
  
  return (
    <View
      className={
        "flex-row items-center justify-between rounded-xl border p-4 shadow-sm " +
        (isDark
          ? "border-border-dark bg-background-cardDark"
          : "border-border-light bg-background-cardLight")
      }
    >
      <View className="flex-row items-center gap-4">
        <View
          className={
            isDark
              ? "size-10 items-center justify-center rounded-lg bg-background-cardDark"
              : "size-10 items-center justify-center rounded-lg bg-background-light"
          }
        >
          <MaterialIcons
            name={prayer.icon as any}
            size={20}
            color={isDark ? "#8FA6A0" : "#6B7F78"}
          />
        </View>
        <View>
          <Text
            className={
              "text-base font-medium " +
              (isDark ? "text-text-primaryDark" : "text-text-primaryLight")
            }
          >
            {prayer.displayName}
          </Text>
          <Text
            className={
              "text-xs " +
              (isDark ? "text-text-secondaryDark" : "text-text-secondaryLight")
            }
          >
            {prayer.time}
          </Text>
        </View>
      </View>

      <View
        className={
          isDark
            ? "rounded-full bg-border-dark/40 px-3 py-1 text-xs font-medium text-text-secondaryDark"
            : "rounded-full bg-border-light/40 px-3 py-1 text-xs font-medium text-text-secondaryLight"
        }
      >
        <Text className="text-[11px]">Yaklaşıyor</Text>
      </View>
    </View>
  );
}

