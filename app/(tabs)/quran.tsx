import React from "react";
import { View, useColorScheme } from "react-native";
import clsx from "clsx";
import QuranSubHeader from "@/components/quran-reading/QuranSubHeader";
import QuranContent from "@/components/quran-reading/QuranContent";
import QuranAudioPlayer from "@/components/quran-reading/QuranAudioPlayer";
import { useQuran } from "@/lib/hooks/quran/useQuran";
import QuranData from "@/lib/quran/arabic/ar.json";
import SurahSelectionModal from "@/components/quran-reading/modals/SurahSelectionModal";
import { useSurahPlayer } from "@/lib/hooks/audio-player/useSurahPlayer";
import { useAudioStore } from "@/lib/storage/useQuranStore";
import { useAyahWordSync } from "@/lib/hooks/quran/useAyahWordSync";

export default function QuranScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [isSurahModalVisible, setIsSurahModalVisible] = React.useState(false);

  const { surah, ayahs, goNext, goPrev, setCurrentSurahNumber } = useQuran(
    QuranData,
    1,
  );

  const {
    activeAyahNumber,
    activeWordIndex,
    isPlaying,
    setIsPlaying,
  } = useAudioStore();

  // useSurahPlayer - sure okuma akışı
  const surahPlayer = useSurahPlayer(surah.ayahs, (page) => {
    // Sayfa değişimi callback'i - useQuran'ın sayfa geçiş mantığı zaten var
    // Burada sadece loglama yapabiliriz veya ek işlemler yapabiliriz
  });

  // Kelime highlight için positionMillis'e göre activeWordIndex güncelle
  useAyahWordSync({
    surahNumber: surah.number,
    ayahs: surah.ayahs,
  });

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
