import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import clsx from "clsx";
import { Dhikr } from "@/types/dhikir";
import React from "react";
import DhikirSelect from "./DhikirSelect";
import DhikirStats from "./DhikirStats";



type DhikrBottomBarProps = {
  readonly currentDhikr: Dhikr | null;
  readonly onReset: () => void;
  readonly isDark: boolean;
  readonly setCurrentDhikr: (item: Dhikr) => void;
};

export default function DhikrBottomBar({
  currentDhikr,
  onReset,
  isDark,
  setCurrentDhikr,
}: DhikrBottomBarProps) {
  const [openDhikrSelect, setOpenDhikrSelect] = React.useState(false);
  const [openDhikrStats, setOpenDhikrStats] = React.useState(false);

  return (
    <>
      <View className="absolute bottom-8 left-0 right-0 px-6 z-20 flex justify-center">
        <View
          className={clsx(
            "backdrop-blur-md rounded-2xl p-2 flex-row items-center gap-2 max-w-[340px] w-full justify-between",
            isDark ? "bg-background-cardDark border border-border-dark/30" : "bg-background-cardLight border border-border-light"
          )}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.04,
            shadowRadius: 30,
            elevation: 8,
          }}
        >
          {/* Reset Button */}
          <Pressable
            className="flex-col items-center justify-center w-14 h-14 rounded-xl"
            onPress={onReset}
          >
            <MaterialIcons
              name="restart-alt"
              size={24}
              color={isDark ? "#8FA6A0" : "#6B7F78"}
            />
          </Pressable>

          {/* Current Dhikr Selector */}
          <Pressable
            onPress={() => setOpenDhikrSelect(true)}
            className={clsx(
              "flex-1 h-14 rounded-xl px-4 flex-row items-center justify-between",
              isDark ? "bg-black/20" : "bg-primary-50"
            )}
          >
            <View className="flex-col items-start overflow-hidden">
              <Text
                className={clsx(
                  "text-[10px] uppercase tracking-wider font-bold",
                  isDark ? "text-text-secondaryDark/50" : "text-text-secondaryLight/40"
                )}
              >
                Current
              </Text>
              <Text
                className={clsx(
                  "text-sm font-medium truncate w-full text-left",
                  isDark ? "text-text-primaryDark" : "text-text-primaryLight"
                )}
              >
                {currentDhikr?.label}
              </Text>
            </View>
            <MaterialIcons
              name="expand-more"
              size={20}
              color={isDark ? "#8FA6A0" : "#6B7F78"}
            />
          </Pressable>

          {/* Stats Button */}
          <Pressable onPress={() => setOpenDhikrStats(true)} className="flex-col items-center justify-center w-14 h-14 rounded-xl">
            <MaterialIcons
              name="bar-chart"
              size={24}
              color={isDark ? "#8FA6A0" : "#6B7F78"}
            />
          </Pressable>
        </View>
      </View>
      <DhikirStats visible={openDhikrStats} onClose={() => setOpenDhikrStats(false)} />
      <DhikirSelect currentDhikr={currentDhikr} openDhikrSelect={openDhikrSelect} setOpenDhikrSelect={setOpenDhikrSelect} setCurrentDhikr={setCurrentDhikr} />
    </>
  );
}

