import { Ayah, Surah } from "@/types/quran";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TranslationMetadata } from "../database/sqlite/translation/repository";

type AudioStateType = {
  // Aktif ayet numarası (şu anda çalan ayet)
  activeAyahNumber: number | null;
  // Oynatma durumu
  isPlaying: boolean;
  // Ses pozisyonu (milisaniye)
  position: number;
  // Ses süresi (milisaniye)
  duration: number;
  // Sure okuma durumu
  isSurahPlaybackActive: boolean;
  // Sure okuma sırasında hangi ayetteyiz (sure içindeki index)
  currentSurahAyahIndex: number | null;
  // Aktif kelime index'i (highlight için)
  activeWordIndex: number;
  // Setter fonksiyonları
  setIsPlaying: (isPlaying: boolean) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setActiveAyahNumber: (ayahNumber: number | null) => void;
  setIsSurahPlaybackActive: (active: boolean) => void;
  setCurrentSurahAyahIndex: (index: number | null) => void;
  setActiveWordIndex: (index: number) => void;
  // Geriye dönük uyumluluk için (kademeli geçiş)
  audioNumber: number;
  setAudioNumber: (audioNumber: number) => void;
};

type SurahStateType = {
  juz: number;
  surahName: string;
  surahEnglishName: string;
  surahNumber: number;
  setJuz: (juz: number) => void;
  setSurahName: (surahName: string) => void;
  setSurahEnglishName: (surahEnglishName: string) => void;
  setSurahNumber: (surahNumber: number) => void;
};
type PageStateType = {
  currentSurahNumber: number;
  currentPageIndex: number;
  setCurrentSurahNumber: (surahNumber: number) => void;
  setCurrentPageIndex: (pageIndex: number) => void;
};
type AyahStateType = {
  ayahs: Ayah[];
  setAyahs: (ayahs: Ayah[]) => void;
  clearCache: () => void;
};

export type TranslationData = { surahs: Surah[] } | null;

type TranslationStateType = {
  translationData: TranslationData;
  selectedTranslation: TranslationMetadata | null;
  setTranslationData: (translationData: TranslationData) => void;
  setSelectedTranslation: (selectedTranslation: TranslationMetadata | null) => void;
};
export const useAudioStore = create<AudioStateType>()(
  persist(
    (set) => ({
      activeAyahNumber: null,
      isPlaying: false,
      position: 0,
      duration: 0,
      isSurahPlaybackActive: false,
      currentSurahAyahIndex: null,
      activeWordIndex: 0,
      // Geriye dönük uyumluluk
      audioNumber: 1,

      setIsPlaying: (isPlaying: boolean) => set({ isPlaying }),
      setPosition: (position: number) => set({ position }),
      setDuration: (duration: number) => set({ duration }),
      setActiveAyahNumber: (ayahNumber: number | null) =>
        set({ activeAyahNumber: ayahNumber }),
      setIsSurahPlaybackActive: (active: boolean) =>
        set({ isSurahPlaybackActive: active }),
      setCurrentSurahAyahIndex: (index: number | null) =>
        set({ currentSurahAyahIndex: index }),
      setActiveWordIndex: (index: number) => set({ activeWordIndex: index }),
      // Geriye dönük uyumluluk (idempotent: aynı değerse state güncelleme)
      setAudioNumber: (audioNumber: number) =>
        set((state) => {
          if (state.audioNumber === audioNumber && state.activeAyahNumber === audioNumber) {
            return state;
          }
          return { audioNumber, activeAyahNumber: audioNumber };
        }),
    }),
    {
      name: "audio-state",
      partialize: (state) => ({
        activeAyahNumber: state.activeAyahNumber,
        audioNumber: state.audioNumber, // Geriye dönük uyumluluk
      }),
    }
  )
);

export const useSurahStore = create<SurahStateType>()(
  persist(
    (set) => ({
      juz: 1,
      surahName: "",
      surahEnglishName: "",
      surahEnglishNameTranslation: "",
      surahNumber: 1,

      setJuz: (juz: number) => set({ juz: juz }),
      setSurahName: (surahName: string) => set({ surahName: surahName }),
      setSurahEnglishName: (surahEnglishName: string) =>
        set({ surahEnglishName: surahEnglishName }),
      setSurahNumber: (surahNumber: number) =>
        set({ surahNumber: surahNumber }),
    }),
    {
      name: "surah-state",
    }
  )
);

export const usePageStore = create<PageStateType>()(
  persist(
    (set) => ({
      currentSurahNumber: 1,
      currentPageIndex: 0,
      setCurrentSurahNumber: (surahNumber: number) =>
        set({ currentSurahNumber: surahNumber }),
      setCurrentPageIndex: (pageIndex: number) =>
        set({ currentPageIndex: pageIndex }),
    }),
    {
      name: "page-state",
    }
  )
);

export const useAyahStore = create<AyahStateType>()(
  persist(
    (set) => ({
      ayahs: [],

      setAyahs: (ayahs: Ayah[]) => set({ ayahs }),

      clearCache: () =>
        set({
          ayahs: [],
        }),
    }),
    {
      name: "quran-store",
    }
  )
);

export const useTranslationStore = create<TranslationStateType>()(
  persist(
    (set) => ({
      translationData: null,
      selectedTranslation: null,
      setTranslationData: (translationData: TranslationData) => set({ translationData }),
      setSelectedTranslation: (selectedTranslation: TranslationMetadata | null) => set({ selectedTranslation }),
    }),
    {
      name: "translation-store",
    }
  )
);