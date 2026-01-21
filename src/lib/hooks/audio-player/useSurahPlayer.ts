import { useEffect, useRef, useCallback } from "react";
import { useAudioStore } from "@/lib/storage/useQuranStore";
import { useQuranAudio } from "@/contexts/QuranAudioContext";
import { Ayah } from "@/types/quran";

type OnPageChangeCallback = (page: number) => void;

/**
 * Sure okuma akışını yöneten hook.
 * Tek paylaşımlı player (QuranAudioContext) kullanır; ayrı Audio.Sound oluşturmaz.
 */
export function useSurahPlayer(
  surahAyahs: Ayah[],
  onPageChange?: OnPageChangeCallback
) {
  const { play, stop, pause, setOnAyahFinish } = useQuranAudio();
  const {
    isSurahPlaybackActive,
    currentSurahAyahIndex,
    isPlaying,
    activeAyahNumber,
    setIsSurahPlaybackActive,
    setCurrentSurahAyahIndex,
    setActiveWordIndex,
    setIsPlaying,
  } = useAudioStore();

  const surahAyahsRef = useRef<Ayah[]>(surahAyahs);
  const onPageChangeRef = useRef<OnPageChangeCallback | undefined>(onPageChange);

  useEffect(() => {
    surahAyahsRef.current = surahAyahs;
  }, [surahAyahs]);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  const handleAyahFinish = useCallback(() => {
    if (!isSurahPlaybackActive) return;
    if (currentSurahAyahIndex === null) return;

    const nextIndex = currentSurahAyahIndex + 1;

    if (nextIndex >= surahAyahsRef.current.length) {
      setIsSurahPlaybackActive(false);
      setCurrentSurahAyahIndex(null);
      setActiveWordIndex(0);
      stop();
      return;
    }

    setCurrentSurahAyahIndex(nextIndex);
    setActiveWordIndex(0);

    const nextAyah = surahAyahsRef.current[nextIndex];
    if (nextAyah) {
      play(nextAyah.number);
      const currentAyah = surahAyahsRef.current[currentSurahAyahIndex];
      if (currentAyah && nextAyah.page !== currentAyah.page && onPageChangeRef.current) {
        onPageChangeRef.current(nextAyah.page);
      }
    }
  }, [
    isSurahPlaybackActive,
    currentSurahAyahIndex,
    play,
    stop,
    setIsSurahPlaybackActive,
    setCurrentSurahAyahIndex,
    setActiveWordIndex,
  ]);

  useEffect(() => {
    setOnAyahFinish(handleAyahFinish);
    return () => setOnAyahFinish(undefined);
  }, [handleAyahFinish, setOnAyahFinish]);

  const playSurah = useCallback(
    (surahNumber: number, startAyahIndex: number = 0) => {
      if (surahAyahsRef.current.length === 0) return;
      const startIndex = Math.max(0, Math.min(startAyahIndex, surahAyahsRef.current.length - 1));
      const startAyah = surahAyahsRef.current[startIndex];
      if (!startAyah) return;
      setIsSurahPlaybackActive(true);
      setCurrentSurahAyahIndex(startIndex);
      setActiveWordIndex(0);
      play(startAyah.number);
    },
    [play, setIsSurahPlaybackActive, setCurrentSurahAyahIndex, setActiveWordIndex]
  );

  const stopSurah = useCallback(() => {
    setIsSurahPlaybackActive(false);
    setCurrentSurahAyahIndex(null);
    setActiveWordIndex(0);
    stop();
  }, [stop, setIsSurahPlaybackActive, setCurrentSurahAyahIndex, setActiveWordIndex]);

  const pauseSurah = useCallback(() => {
    pause();
  }, [pause]);

  // Sure okumayı devam ettir (pause sonrası)
  const resumeSurah = useCallback(() => {
    // Aynı ayet yüklüyse sadece play state'ini açmak yeterli
    setIsPlaying(true);
  }, [setIsPlaying]);

  const playAyahManually = useCallback(
    (ayahNumber: number) => {
      setIsSurahPlaybackActive(false);
      setCurrentSurahAyahIndex(null);
      setActiveWordIndex(0);
      play(ayahNumber);
    },
    [play, setIsSurahPlaybackActive, setCurrentSurahAyahIndex, setActiveWordIndex]
  );

  const toggleCurrentAyahPlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  const cancelSurahPlayback = useCallback(() => {
    if (isSurahPlaybackActive) {
      stopSurah();
    }
  }, [isSurahPlaybackActive, stopSurah]);

  return {
    playSurah,
    stopSurah,
    pauseSurah,
    resumeSurah,
    cancelSurahPlayback,
    playAyahManually,
    toggleCurrentAyahPlayPause,
    isSurahPlaybackActive,
    currentSurahAyahIndex,
    currentAyahNumber: activeAyahNumber,
    isPlaying,
    activeAyahNumber,
  };
}
