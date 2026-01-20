import { View, useColorScheme } from "react-native";
import React, { useState, useEffect } from "react";
import clsx from "clsx";
import QuranSubHeader from "@/components/quran-reading/QuranSubHeader";
import QuranContent from "@/components/quran-reading/QuranContent";
import QuranAudioPlayer from "@/components/quran-reading/QuranAudioPlayer";
import { useQuran } from "@/lib/hooks/useQuran";
import QuranData from "@/lib/quran/arabic/ar.json";
import SurahSelectionModal from "@/components/quran-reading/modals/SurahSelectionModal";
import { useSurahPlayer } from "@/lib/hooks/useSurahPlayer";
import { useAudioStore } from "@/lib/storage/useQuranStore";
import { splitAyahText } from "@/lib/quran/utils/wordSplitter";
import {
  getActiveWordIndexFromTimings,
  getVerseTiming,
} from "@/lib/quran/utils/audioTimings";

export default function QuranScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [isSurahModalVisible, setIsSurahModalVisible] = useState(false);

  const { surah, ayahs, goNext, goPrev, setCurrentSurahNumber } = useQuran(
    QuranData,
    1,
  );

  const {
    activeAyahNumber,
    activeWordIndex,
    position,
    duration,
    isPlaying,
    setIsPlaying,
    setActiveWordIndex,
  } = useAudioStore();

  // useSurahPlayer - sure okuma akışı
  const surahPlayer = useSurahPlayer(surah.ayahs, (page) => {
    // Sayfa değişimi callback'i - useQuran'ın sayfa geçiş mantığı zaten var
    // Burada sadece loglama yapabiliriz veya ek işlemler yapabiliriz
  });

  // Kelime highlight için positionMillis'e göre activeWordIndex güncelle
  useEffect(() => {
    if (
      activeAyahNumber === null ||
      duration === 0 ||
      position === 0 ||
      !isPlaying
    ) {
      return;
    }

    // Aktif ayeti bul
    const activeAyah = surah.ayahs.find(
      (ayah) => ayah.number === activeAyahNumber
    );

    if (!activeAyah) return;

    // Ayet metnini kelimelere böl
    const words = splitAyahText(activeAyah.text);
    if (words.length === 0) return;

    // 1) Timing tabanlı hesap (varsa)
    const verseTiming = getVerseTiming(surah.number, activeAyah.numberInSurah);
    const timingIndex =
      verseTiming ? getActiveWordIndexFromTimings(position, verseTiming) : null;

    // 2) Fallback: tahmini (eşit süre) hesap
    const fallbackIndex = (() => {
      const wordDuration = duration / words.length;
      const currentWordIndex = Math.floor(position / wordDuration);
      return Math.min(currentWordIndex, words.length - 1);
    })();

    const clampedIndex =
      timingIndex !== null
        ? Math.max(0, Math.min(timingIndex, words.length - 1))
        : fallbackIndex;

    if (clampedIndex !== activeWordIndex) {
      setActiveWordIndex(clampedIndex);
    }
  }, [
    activeAyahNumber,
    position,
    duration,
    isPlaying,
    surah.ayahs,
    activeWordIndex,
    setActiveWordIndex,
  ]);

  // Sure okuma başlatma fonksiyonu
  const handlePlaySurah = (surahNumber: number) => {
    // Eğer aynı sure'deysek ve sure okuma aktifse, pause yap
    if (surah.number === surahNumber && surahPlayer.isSurahPlaybackActive) {
      if (surahPlayer.isPlaying) {
        surahPlayer.pauseSurah();
      } else {
        // Devam et
        surahPlayer.resumeSurah();
      }
      return;
    }

    // Yeni sure okuma başlat
    surahPlayer.playSurah(surahNumber, 0);
  };

  // Ayet tıklandığında sure okumasını iptal et
  const handleAyahPress = (ayahNumber: number) => {
    // Manuel etkileşim: sure okuması iptal edilmeli
    if (surahPlayer.isSurahPlaybackActive) {
      surahPlayer.cancelSurahPlayback();
    }

    // Aynı ayetse toggle (pause artık çalışmalı)
    if (activeAyahNumber === ayahNumber) {
      setIsPlaying(!isPlaying);
      return;
    }

    // Farklı ayet: tek instance üzerinden çal
    surahPlayer.playAyahManually(ayahNumber);
  };

  // Kullanıcı scroll yaptığında sure okumasını iptal et
  const handleScroll = () => {
    surahPlayer.cancelSurahPlayback();
  };

  return (
    <View
      className={clsx(
        "relative flex-1",
        isDark ? "flex-1 bg-background-dark" : "flex-1 bg-background-light"
      )}
    >
      <QuranSubHeader
        isDark={isDark}
        onOpenSurahModal={() => setIsSurahModalVisible(true)}
        onPlaySurah={handlePlaySurah}
      />

      <QuranContent
        isDark={isDark}
        ayahs={ayahs}
        goNext={goNext}
        goPrev={goPrev}
        activeAyahNumber={activeAyahNumber}
        activeWordIndex={activeWordIndex}
        onScroll={handleScroll}
        onAyahPress={handleAyahPress}
      />
      <QuranAudioPlayer
        isDark={isDark}
      />
      <SurahSelectionModal
        setCurrentPage={setCurrentSurahNumber}
        visible={isSurahModalVisible}
        onClose={() => setIsSurahModalVisible(false)}
      />
    </View>
  );
}
