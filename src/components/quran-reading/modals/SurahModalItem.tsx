import { MaterialIcons } from "@expo/vector-icons";
import clsx from "clsx";
import { Text, View } from "react-native";
import { colors } from "@/components/theme/colors";
import { SurahType } from "@/components/quran-reading/types/types";
import Button from "@/components/button/Button";
import { useSurahStore } from "@/lib/storage/useQuranStore";

type SurahListItemProps = {
  readonly surah: SurahType;
  readonly isDark: boolean;
  readonly setCurrentPage: (page: number) => void;
  readonly onClose: () => void;
  readonly setSearch: (value: string) => void;
};

export function SurahListItem({
  surah,
  isDark,
  setCurrentPage,
  onClose,
  setSearch,
}: SurahListItemProps) {
  const { surahNumber } = useSurahStore();

  const isActive = surah.surahNumber === surahNumber;

  const handlePress = () => {
    setCurrentPage(surah.surahNumber);
    onClose();
    setSearch("");
  };
  return (
    <Button
      onPress={handlePress}
      isDark={isDark}
      size="large"
      isActive={isActive}
    >
      <View
        className={clsx(
          "flex h-10 w-10 items-center justify-center rounded-full",
          isDark && isActive && "bg-primary-800",
          !isDark && isActive && "bg-primary-500 "
        )}
      >
        <Text
          className={clsx(
            "text-sm font-semibold",
            isActive ? "text-white" : "text-text-primaryLight"
          )}
        >
          {surah.surahNumber}
        </Text>
      </View>

      <View className="min-w-0 flex-1">
        <View className="flex-row items-baseline gap-2">
          <Text
            className={clsx(
              "truncate text-base font-semibold ",
              isDark ? "text-text-primaryDark" : "text-text-primaryLight"
            )}
          >
            {surah.surahArabicName}
          </Text>
          <Text
            className={clsx(
              "truncate text-sm ",
              isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
            )}
          >
            {surah.surahEnglishName}
          </Text>
        </View>

        <View className="mt-0.5 flex-row items-center gap-2">
          <Text
            className={clsx(
              "text-xs ",
              isDark ? "text-text-secondaryDark" : "text-blue-400"
            )}
          >
            • {surah.ayahCount} Ayet
          </Text>
        </View>
      </View>

      <View className="items-center justify-center">
        <MaterialIcons
          name={isActive ? "play-circle" : "chevron-right"}
          size={isActive ? 26 : 20}
          color={isActive ? colors.primary[500] : colors.text.secondaryLight}
        />
      </View>
    </Button>
  );
}
