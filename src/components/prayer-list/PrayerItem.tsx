import { MaterialIcons } from "@expo/vector-icons";
import clsx from "clsx";
import { Pressable, Text, View } from "react-native";
import {
  getActiveBorderColor,
  getBackgroundColor,
  getBorderColor,
  getIconBackgroundColor,
  getIconColor,
  getMeaningTextColor,
  getNameTextColor,
  getNotificationBadgeBg,
  getNotificationIconColor,
  getTimeTextColor,
} from "../adhan/utils/utils-styles";
import { useState } from "react";
import { useUpdatePrayerStatusLocal } from "@/lib/hooks/prayer-tracking/usePrayerTrackingLocal";
import { ActionButtons } from "./ActionButtons";

type PrayerItem = {
  readonly name: string;
  readonly time: string;
  readonly key: string;
  readonly meaning: string;
  readonly icon: string;
};

type PrayerItemProps = {
  readonly prayer: PrayerItem;
  readonly isDark: boolean;
  readonly isPast: boolean;
  readonly isActive: boolean;
  readonly extended?: boolean;
};

export default function PrayerItem({
  prayer,
  isDark,
  isPast,
  isActive,
  extended,
}: PrayerItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { mutate: updateStatus, isPending } = useUpdatePrayerStatusLocal();

  const canExpand = extended && (isPast || isActive);

  return (
    <Pressable
      onPress={canExpand ? () => setIsExpanded(!isExpanded) : undefined}
      disabled={extended && isPending || !canExpand}
      className={clsx(
        "flex-1 items-center gap-4 p-4 rounded-xl border shadow-sm relative overflow-hidden",
        getBackgroundColor(isActive, isPast, isDark),
        getBorderColor(isActive, isDark)
      )}
    >
      {isActive && (
        <View
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: getActiveBorderColor() }}
        />
      )}
      <View className="flex-row items-center gap-4">
        <View
          className="p-2 rounded-full flex items-center justify-center"
          style={{ backgroundColor: getIconBackgroundColor(isActive, isDark) }}
        >
          <MaterialIcons
            name={prayer.icon as any}
            size={20}
            color={getIconColor(isActive, isDark)}
          />
        </View>
        <View className="flex-1" style={{ opacity: isPast ? 0.7 : 1 }}>
          <Text
            className={clsx(
              "text-base font-medium leading-normal",
              getNameTextColor(isActive, isDark)
            )}
          >
            {prayer.name}
          </Text>
          <Text
            className={clsx("text-xs", getMeaningTextColor(isActive, isDark))}
          >
            {prayer.meaning}
          </Text>
        </View>
        <View className="shrink-0 text-right flex-col items-end">
          <Text
            className={clsx(
              "text-base font-medium leading-normal",
              getTimeTextColor(isActive, isPast, isDark)
            )}
          >
            {prayer.time}
          </Text>
          {isActive && (
            <View
              className="flex-row items-center gap-1 px-2 py-0.5 rounded-full mt-1"
              style={{ backgroundColor: getNotificationBadgeBg(isDark) }}
            >
              <MaterialIcons
                name="notifications-active"
                size={10}
                color={getNotificationIconColor()}
              />
              <Text
                className="text-[10px] font-medium"
                style={{ color: getNotificationIconColor() }}
              >
                ON
              </Text>
            </View>
          )}
        </View>
      </View>
      {extended && isExpanded && (
        <ActionButtons
          updateStatus={updateStatus}
          setIsExpanded={setIsExpanded}
          isPending={isPending}
          prayer={prayer}
          isActive={isActive}
          isPast={isPast}
        />
      )}
    </Pressable>
  );
}
