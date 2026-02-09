import { MaterialIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import clsx from "clsx";
import Button from "../button/Button";
import { colors } from "@/components/theme/colors";
import TranslationSelect from "../quran-reading/modals/TranslationSelect";
import React from "react";

type DailyVerseHeaderProps = {
  readonly isDark: boolean;
};

export default function DailyVerseHeader({ isDark }: DailyVerseHeaderProps) {
  const router = useRouter();
  const [translationModal, setTranslationModal] = React.useState(false);
  return (
    <View className="flex-row items-center p-6 justify-between z-10">
      <Button onPress={() => router.back()} size="small">
        <MaterialIcons
          name="arrow-back"
          size={24}
          color={isDark ? colors.text.primaryDark : colors.text.primaryLight}
        />
      </Button>
      <View className="flex-col items-center">
        <Text
          className={clsx(
            "text-lg font-bold tracking-tight",
            isDark ? "text-text-primaryDark" : "text-text-primaryLight"
          )}
        >
          Daily Reflection
        </Text>
      </View>
      <Button onPress={() => setTranslationModal(true)} size="small">
        <MaterialIcons
          name="settings"
          size={24}
          color={isDark ? colors.text.primaryDark : colors.text.primaryLight}
        />
      </Button>
      <TranslationSelect
        visible={translationModal}
        onClose={() => setTranslationModal(false)}
      />
    </View>
  );
}

