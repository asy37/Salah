import { useEffect, useRef, useCallback } from "react";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { getAyahAudioUrl } from "../api/services/quranApi";
import { useAudioStore } from "@/lib/storage/useQuranStore";

type OnAyahFinishCallback = () => void;

/**
 * Tek bir ayetin sesini çalan hook
 * Sorumlulukları:
 * - play / pause / stop
 * - Audio.Sound lifecycle yönetimi
 * - durationMillis ve positionMillis takibi
 * - isPlaying state
 * - Ayet bittiğinde didJustFinish callback
 * 
 * Ayet bitince otomatik olarak başka ayete geçmez
 */
export function useAyahPlayer(onAyahFinish?: OnAyahFinishCallback) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const currentAyahRef = useRef<number | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const onFinishCallbackRef = useRef<OnAyahFinishCallback | undefined>(
    onAyahFinish
  );

  const {
    activeAyahNumber,
    isPlaying,
    position,
    duration,
    setIsPlaying,
    setPosition,
    setDuration,
    setActiveAyahNumber,
    setActiveWordIndex,
  } = useAudioStore();

  // Callback ref'i güncelle
  useEffect(() => {
    onFinishCallbackRef.current = onAyahFinish;
  }, [onAyahFinish]);

  // Audio mode setup
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      allowsRecordingIOS: false,
      shouldDuckAndroid: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    });

    return () => {
      cleanupSound();
    };
  }, []);

  // Ses dosyasını temizle
  const cleanupSound = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (error) {
        console.error("Audio cleanup error:", error);
      }
      soundRef.current = null;
    }
    currentAyahRef.current = null;
  }, []);

  // activeAyahNumber değiştiğinde yeni ses yükle
  useEffect(() => {
    if (activeAyahNumber === null) {
      cleanupSound();
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
      setActiveWordIndex(0);
      isPlayingRef.current = false;
      return;
    }

    // Aynı ayet zaten yüklenmişse, sadece play/pause durumunu kontrol et
    if (currentAyahRef.current === activeAyahNumber && soundRef.current) {
      return;
    }

    // Yeni ayet için ses yükle
    const loadAudio = async () => {
      await cleanupSound();

      try {
        const audioUrl = getAyahAudioUrl(activeAyahNumber);
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          {
            shouldPlay: false,
            volume: 1.0,
            rate: 1.0,
            isMuted: false,
            progressUpdateIntervalMillis: 250, // Her 250ms'de bir güncelle (daha az CPU kullanımı)
          }
        );

        // Status callback'ini ayrı olarak ayarla (daha optimize)
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;

          setPosition(status.positionMillis ?? 0);
          setDuration(status.durationMillis ?? 0);

          // Ayet bittiğinde callback çağır
          if (status.didJustFinish) {
            setIsPlaying(false);
            isPlayingRef.current = false;
            setPosition(0);
            setActiveWordIndex(0);
            soundRef.current?.setPositionAsync(0).catch(() => {});
            
            // Callback'i çağır
            if (onFinishCallbackRef.current) {
              onFinishCallbackRef.current();
            }
          }
        });

        soundRef.current = sound;
        currentAyahRef.current = activeAyahNumber;
        isPlayingRef.current = false;

        // Eğer isPlaying true ise, sesi çal
        if (isPlaying) {
          await sound.playAsync();
          isPlayingRef.current = true;
        }
      } catch (error) {
        console.error("Audio yükleme hatası:", error);
        setIsPlaying(false);
        isPlayingRef.current = false;
        setPosition(0);
        setDuration(0);
      }
    };

    loadAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAyahNumber, cleanupSound, setIsPlaying, setPosition, setDuration, setActiveWordIndex]);

  // isPlaying değiştiğinde play/pause toggle yap
  useEffect(() => {
    if (!soundRef.current) return;
    if (isPlayingRef.current === isPlaying) return; // Aynı değerse işlem yapma

    const handlePlayPause = async () => {
      const sound = soundRef.current;
      if (!sound) return;

      try {
        const status = await sound.getStatusAsync();
        // Bu arada sound unload edilmiş olabilir
        if (!status.isLoaded || soundRef.current !== sound) return;

        if (isPlaying) {
          await sound.playAsync();
          isPlayingRef.current = true;
        } else {
          await sound.pauseAsync();
          isPlayingRef.current = false;
        }
      } catch (error) {
        // Race condition: sound unload/henüz load olmadan pause/play çağrısı gelebiliyor.
        // Bu durumda sessizce yutuyoruz.
        isPlayingRef.current = false;
      }
    };

    handlePlayPause();
  }, [isPlaying]);

  // Play fonksiyonu
  const play = useCallback(
    async (ayahNumber: number) => {
      setActiveAyahNumber(ayahNumber);
      setIsPlaying(true);
    },
    [setActiveAyahNumber, setIsPlaying]
  );

  // Pause fonksiyonu
  const pause = useCallback(async () => {
    setIsPlaying(false);
  }, [setIsPlaying]);

  // Stop fonksiyonu
  const stop = useCallback(async () => {
    setIsPlaying(false);
    setPosition(0);
    setActiveWordIndex(0);
    const sound = soundRef.current;
    if (!sound) return;

    try {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded || soundRef.current !== sound) return;

      await sound.setPositionAsync(0);
      await sound.pauseAsync();
    } catch (error) {
      // Race condition: sound unload/henüz load olmadan stop çağrısı gelebiliyor.
      // Burada crash yerine sessizce yutuyoruz.
      // (İstersen log seviyesini debug'a düşürebiliriz.)
    }
  }, [setIsPlaying, setPosition, setActiveWordIndex]);

  return {
    play,
    pause,
    stop,
    isPlaying,
    position,
    duration,
    currentAyahNumber: activeAyahNumber,
  };
}
