import { MaterialIcons } from "@expo/vector-icons";
import { Text, TextInput, useColorScheme, View } from "react-native";
import { useRouter } from "expo-router";
import clsx from "clsx";
import Button from "@/components/button/Button";
import { colors } from "@/components/theme/colors";
import React from "react";

type DuasHeaderProps = {
  readonly setSearchQuery: (query: string) => void;
};
export default function DuasHeader({ setSearchQuery }: DuasHeaderProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View
      className={clsx(
        "sticky top-0 z-10 border-b",
        isDark
          ? "bg-background-dark/95 border-border-dark/20"
          : "bg-background-light/95 border-border-light/20"
      )}
    >
      <View className="flex-row items-center w-full justify-between p-4 pb-2">
        <Button onPress={() => router.back()} size="small">
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={isDark ? colors.text.primaryDark : colors.text.primaryLight}
          />
        </Button>
        <View className="flex-row gap-3 relative">
          <TextInput
            placeholder="Search"
            onChangeText={setSearchQuery}
            className="bg-white min-w-80 border border-border-light/20 rounded-lg pl-10 p-2"
            placeholderTextColor={isDark ? colors.text.secondaryDark : colors.text.secondaryLight}
          />
          <MaterialIcons
            className="absolute left-2 top-1/2 -translate-y-1/2"
            name="search"
            size={24}
            color={isDark ? colors.text.primaryDark : colors.text.primaryLight}
          />
        </View>
      </View>
      <View className="px-4 pb-4 pt-2">
        <Text
          className={clsx(
            "text-3xl font-bold tracking-tight",
            isDark ? "text-text-primaryDark" : "text-text-primaryLight"
          )}
        >
          My Dua Journal
        </Text>
        <Text
          className={clsx(
            "text-sm mt-1",
            isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
          )}
        >
          "Call upon Me, I will answer you." (Quran 40:60)
        </Text>
      </View>
    </View>
  );
}

