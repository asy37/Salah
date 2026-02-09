import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { colors } from "../theme/colors";
import type { PrayerWithTime } from "@/types/prayer-tracking";
import { useMarkPrayerCompleted, useSetRemindLater } from "@/lib/hooks/prayer-tracking/usePrayerTracking";
import { useState } from "react";
import { useTheme } from "@/lib/storage/useThemeStore";

type ActivePrayerCardProps = {
  readonly prayer: PrayerWithTime;
};

export default function ActivePrayerCard({ prayer }: ActivePrayerCardProps) {
  const { isDark } = useTheme();
  const markCompleted = useMarkPrayerCompleted();
  const setRemindLater = useSetRemindLater();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMarkCompleted = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Convert scheduled time to TIME format (HH:MM:SS)
      const [hours, minutes] = prayer.scheduledTime.split(':');
      const timeString = `${hours}:${minutes}:00`;
      
      await markCompleted.mutateAsync({
        prayerName: prayer.prayer_name,
        prayerTime: timeString,
      });
    } catch (error) {
      console.error('Failed to mark prayer as completed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemindLater = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      await setRemindLater.mutateAsync(prayer.prayer_name);
    } catch (error) {
      console.error('Failed to set remind later:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View
      className={
        "relative overflow-hidden rounded-2xl border-2 shadow-xl " +
        (isDark
          ? "border-primary-500/30 bg-background-cardDark shadow-primary-500/10"
          : "border-primary-500/20 bg-background-cardLight shadow-primary-500/20")
      }
    >
      <View className="absolute left-0 top-0 h-full w-1.5 bg-primary-500" />

      <View className="p-5 mb-6 flex-row items-start justify-between pl-2">
        <View className="flex-row items-center gap-4">
          <View
            className={
              isDark
                ? "size-12 items-center justify-center rounded-xl bg-background-cardDark"
                : "size-12 items-center justify-center rounded-xl bg-primary-500/10"
            }
          >
            <MaterialIcons
              name={prayer.icon as any}
              size={26}
              color={isDark ? colors.success : colors.primary[500]}
            />
          </View>
          <View>
            <Text
              className={
                "text-lg font-bold " +
                (isDark ? "text-text-primaryDark" : "text-text-primaryLight")
              }
            >
              {prayer.displayName}
            </Text>
            <View className="mt-0.5 flex-row items-center gap-1.5">
              <View className="relative h-2 w-2">
                <View className="absolute h-2 w-2 rounded-full bg-primary-500 opacity-75" />
              </View>
              <Text className="text-sm font-medium text-primary-500">
                Şimdi • {prayer.time}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="flex-row gap-3 pl-2 m-2">
        <Pressable
          onPress={handleMarkCompleted}
          disabled={isProcessing}
          className="flex-[3] flex-row items-center justify-center gap-2 rounded-xl bg-primary-500 py-3.5 px-4 shadow-[0_4px_14px_rgba(31,143,95,0.3)] active:scale-[0.98] disabled:opacity-50"
        >
          <MaterialIcons name="check" size={20} color="#fff" />
          <Text className="text-sm font-bold text-white">
            {isProcessing ? "İşleniyor..." : "Kıldım"}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleRemindLater}
          disabled={isProcessing}
          className={
            isDark
              ? "flex-[2] flex-row items-center justify-center gap-2 rounded-xl border border-border-dark bg-transparent py-3.5 px-4 active:scale-[0.98] disabled:opacity-50"
              : "flex-[2] flex-row items-center justify-center gap-2 rounded-xl border border-border-light bg-transparent py-3.5 px-4 active:scale-[0.98] disabled:opacity-50"
          }
        >
          <MaterialIcons
            name="alarm"
            size={20}
            color={isDark ? "#EAF3F0" : "#6B7F78"}
          />
          <Text
            className={
              "text-sm font-medium " +
              (isDark ? "text-text-primaryDark" : "text-text-secondaryLight")
            }
          >
            Sonra
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

