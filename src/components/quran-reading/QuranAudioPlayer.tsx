import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { useAudioStore, useSurahStore } from "@/lib/storage/useQuranStore";
import { formatTime, progressPercentage } from "@/components/quran-reading/utils/utils";
import { useTheme } from "@/lib/storage/useThemeStore";



export default function QuranAudioPlayer() {
  const { isDark } = useTheme();
  const {
    activeAyahNumber,
    setActiveAyahNumber,
    isPlaying,
    setIsPlaying,
    position,
    duration,
  } = useAudioStore();
  const { surahName, surahEnglishName } = useSurahStore();

  const handleTogglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // activeAyahNumber null ise player'ı gizle
  if (activeAyahNumber === null) {
    return null;
  }

  return (
    <View className="absolute left-4 right-4 bottom-6 z-20">
      <View
        className={
          "rounded-2xl border p-4 shadow-xl " +
          (isDark
            ? "border-border-dark/40 bg-background-cardDark/95"
            : "border-border-light bg-background-cardLight/95")
        }
      >
        <View className="mb-3 flex flex-row items-center gap-4">
          <Pressable
            onPress={handleTogglePlayPause}
            className="flex size-12 items-center justify-center rounded-full bg-primary-500 shadow-[0_4px_12px_rgba(31,143,95,0.3)] active:scale-95"
          >
            <MaterialIcons
              name={isPlaying ? "pause" : "play-arrow"}
              size={24}
              color={isDark ? colors.background.dark : colors.background.light}
            />
          </Pressable>

          <View className="min-w-0 flex-1 flex-col justify-center">
            <Text
              className={
                "truncate text-base font-bold leading-tight " +
                (isDark ? "text-text-primaryDark" : "text-text-primaryLight")
              }
            >
              {surahName || "Surah"}
            </Text>
            <Text
              className={
                "mt-1 truncate text-xs font-medium tracking-wide " +
                (isDark
                  ? "text-text-secondaryDark"
                  : "text-text-secondaryLight")
              }
            >
              {surahEnglishName || "Audio"}
            </Text>
          </View>

          <View className="flex flex-row items-center gap-2">
            <Pressable
              onPress={() => {
                if (activeAyahNumber > 1) {
                  const newNumber = activeAyahNumber - 1;
                  setActiveAyahNumber(newNumber);
                  setIsPlaying(true);
                }
              }}
              className="rounded-full p-2"
            >
              <MaterialIcons name="skip-previous" size={22} />
            </Pressable>
            <Pressable
              onPress={() => {
                const newNumber = activeAyahNumber + 1;
                setActiveAyahNumber(newNumber);
                setIsPlaying(true);
              }}
              className="rounded-full p-2"
            >
              <MaterialIcons name="skip-next" size={22} />
            </Pressable>
          </View>
        </View>

        <View className="pt-1">
          <View
            className={
              "relative h-1 w-full overflow-hidden rounded-full " +
              (isDark ? "bg-text-secondaryDark/20" : "bg-border-light")
            }
          >
            <View
              className="absolute left-0 top-0 h-full rounded-full bg-primary-500"
              style={StyleSheet.flatten([{ width: `${progressPercentage(duration, position)}%` }])}
            />
          </View>
          <View className="mt-1.5 flex flex-row justify-between">
            <Text
              className={
                "text-[10px] font-medium tracking-wider " +
                (isDark
                  ? "text-text-secondaryDark"
                  : "text-text-secondaryLight")
              }
            >
              {formatTime(position)}
            </Text>
            <Text
              className={
                "text-[10px] font-medium tracking-wider " +
                (isDark
                  ? "text-text-secondaryDark"
                  : "text-text-secondaryLight")
              }
            >
              {formatTime(duration)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
