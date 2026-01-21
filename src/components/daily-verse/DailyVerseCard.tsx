import { Text, View } from "react-native";
import clsx from "clsx";
import { useAudioStore } from "@/lib/storage/useQuranStore";
import React, { useEffect } from "react";
import { useQuran } from "@/lib/hooks/quran/useQuran";
import QuranData from "@/lib/quran/arabic/ar.json";
import { useQuranAudio } from "@/contexts/QuranAudioContext";
import AyahBlock from "../quran-reading/AyahBlock";
import { DailyVerseAudio } from "./DailyVerseAudio";
import SurahInfo from "./SurahInfo";
import { useAyahWordSync } from "@/lib/hooks/daily-verse/useAyahWordSync";

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
    activeWordIndex,
  } = useAudioStore();

  useEffect(() => {
    if (dailyAyah) setActiveAyahNumber(dailyAyah.number);
  }, [dailyAyah?.number, setActiveAyahNumber]);

  // Kelime takibi: günlük ayet çalarken activeWordIndex güncelle (quran.tsx ile aynı mantık)
  useAyahWordSync({
    ayahText: dailyAyah?.text,
    ayahNumber: dailyAyah?.number,
    surahNumber: dailyAyah?.surahNumber,
    verseNumberInSurah: dailyAyah?.numberInSurah,
  });

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
      <AyahBlock
        ayah={dailyAyah}
        isDark={isDark}
        onAyahPress={handleAyahPress}
        activeWordIndex={
          activeAyahNumber === dailyAyah.number ? activeWordIndex : -1
        }
      />
      <SurahInfo dailyAyah={dailyAyah} isDark={isDark} />
      <View className={clsx("w-full h-[1px] rounded-full",
        isDark ? "bg-light" : "bg-primary-400"
      )} />
      <DailyVerseAudio
        dailyAyah={dailyAyah}
        isDark={isDark}
        handleAyahPress={handleAyahPress}
      />
    </View>
  );
}

