import { MaterialIcons } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";
import clsx from "clsx";
import Button from "../button/Button";
import { colors } from "../theme/colors";
import { useAudioStore } from "@/lib/storage/useQuranStore";
import React from "react";
import { useQuran } from "@/lib/hooks/useQuran";
import QuranData from "@/lib/quran/arabic/ar.json";
import { useQuranAudio } from "@/contexts/QuranAudioContext";

type DailyVerseCardProps = {
  readonly isDark: boolean;
};

export default function DailyVerseCard({ isDark }: DailyVerseCardProps) {
  const { getDailyAyah } = useQuran(QuranData, 1);
  const dailyAyah = getDailyAyah();
  const { play } = useQuranAudio();
  const {
    activeAyahNumber,
    setActiveAyahNumber,
    isPlaying,
    setIsPlaying,
    setIsSurahPlaybackActive,
    setCurrentSurahAyahIndex,
    setActiveWordIndex,
  } = useAudioStore();

  React.useEffect(() => {
    if (dailyAyah) setActiveAyahNumber(dailyAyah.number);
  }, [dailyAyah?.number, setActiveAyahNumber]);

  const handleAyahPress = (ayahNumber: number) => {
    if (activeAyahNumber === ayahNumber) {
      setIsPlaying(!isPlaying);
      return;
    }
    setIsSurahPlaybackActive(false);
    setCurrentSurahAyahIndex(null);
    setActiveWordIndex(0);
    play(ayahNumber);
  };

  if (!dailyAyah) return null;

  return (
    <View className="flex-1 flex-col justify-center p-5 gap-6 bg-white border border-gray-200 rounded-2xl">
      <Text
        className={clsx(
          "text-3xl md:text-4xl font-bold leading-loose py-2 text-center",
          isDark ? "text-text-primaryDark" : "text-text-primaryLight"
        )}
        style={{ lineHeight: 60 }}
      >
        بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
      </Text>
      <ScrollView className="flex-col gap-2 max-h-[200px]">
        {/* Arabic */}
        <Text
          className={clsx(
            "text-3xl md:text-4xl font-bold leading-loose py-2 text-right",
            isDark ? "text-text-primaryDark" : "text-text-primaryLight"
          )}
          style={{ lineHeight: 60 }}
        >
          {dailyAyah.text}
        </Text>
        {/* Translation */}
        <Text
          className={clsx(
            "text-lg font-normal leading-relaxed",
            isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
          )}
        >
          {dailyAyah.translationText ?? ""}
        </Text>
      </ScrollView>
      {/* Surah Info */}
      <View
        className={clsx(
          "inline-flex items-center justify-center px-5 py-1.5 rounded-full mb-8 border",
          isDark
            ? "bg-primary-500/20 border-primary-500/10"
            : "bg-primary-50 border-primary-500/10"
        )}
      >
        <Text
          className={clsx(
            "text-sm font-semibold tracking-wide",
            isDark ? "text-primary-300" : "text-primary-500"
          )}
        >
         Juz: {dailyAyah.juz}  
        </Text>
        <Text
          className={clsx(
            "text-sm font-semibold tracking-wide",
            isDark ? "text-primary-300" : "text-primary-500"
          )}
        >
           Surah :{dailyAyah.surahArabicName + "/" + dailyAyah.surahTranslation}
        </Text>
        <Text
          className={clsx(
            "text-sm font-semibold tracking-wide",
            isDark ? "text-primary-300" : "text-primary-500"
          )}
        >
          Ayah Number: {dailyAyah.number}
        </Text>
      </View>
      <View
        className={clsx(
          "group relative flex-col items-center rounded-3xl overflow-hidden",
          isDark ? "bg-background-cardDark" : "bg-background-cardLight"
        )}

      >
        <View className={clsx("w-full h-0.5 rounded-full",
          isDark ? "bg-light" : "bg-primary-500"
        )} />
      </View>
      <View className="flex-row items-center justify-between">
        <View className=" items-center gap-2">
          <MaterialIcons name="share" size={24} color="primary-500" />
          <Text className="text-sm font-bold">Share</Text>
        </View>
        <Button onPress={() => handleAyahPress(dailyAyah.number)} isDark={isDark} className="p-5">
          <MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={24} color={colors.primary[500]} />
        </Button>
        <View className=" items-center gap-2">
          <MaterialIcons name="favorite" size={24} color="primary-500" />
          <Text className="text-sm font-bold">Share</Text>
        </View>
      </View>
    </View>
  );
}

