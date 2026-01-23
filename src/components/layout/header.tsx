import {
  Image,
  Modal,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePrayerStreak } from "@/lib/hooks/prayer-tracking/usePrayerTracking";
import StreakCounter from "@/components/tracking/StreakCounter";
import { useState } from "react";
import Button from "@/components/button/Button";
import clsx from "clsx";

export default function PrayerHeader() {
  const [isStreakModalVisible, setIsStreakModalVisible] = useState(false);
  const AVATAR_URL = "https://github.com/shadcn.png";
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { data: streakData } = usePrayerStreak();

  return (
    <SafeAreaView
      edges={["top"]}
      className={isDark ? "bg-background-dark" : "bg-background-light"}
    >
      <View
        className={clsx(
          "border-b px-4 py-2 ",
          isDark
            ? "border-border-dark bg-background-dark/95"
            : "border-border-light bg-background-light/95"
        )}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Image
              source={{ uri: AVATAR_URL }}
              className="size-10 rounded-full bg-center bg-cover ring-2 ring-primary-500/20"
            />
            <View>
              <Text
                className={clsx(
                  "text-base font-bold ",
                  isDark ? "text-text-primaryDark" : "text-text-primaryLight"
                )}
              >
                Selam, Ahmet
              </Text>
              <Text
                className={clsx(
                  "text-xs ",
                  isDark
                    ? "text-text-secondaryDark"
                    : "text-text-secondaryLight"
                )}
              >
                14 Ramazan 1445
              </Text>
            </View>
          </View>
          <Button
            text={`${streakData?.count ?? 0} Gün`}
            onPress={() => setIsStreakModalVisible(true)}
            rightIcon="local-fire-department"
            size="small"
            backgroundColor="primary"
          />

          <Modal
            visible={isStreakModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setIsStreakModalVisible(false)}
          >
            <Pressable
              className="flex-1 items-center justify-center bg-black/40"
              onPress={() => setIsStreakModalVisible(false)}
            >
              <Pressable
                onPress={() => {}}
                className={clsx(
                  "w-[90%] max-w-sm rounded-2xl p-4 shadow-lg ",
                  isDark ? "bg-background-cardDark" : "bg-background-cardLight"
                )}
              >
                {streakData && <StreakCounter streak={streakData} />}
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      </View>
    </SafeAreaView>
  );
}
