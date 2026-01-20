// Quran API Types - alquran.cloud
// These types are designed for UI usage and future SQLite normalization

// --------------------
// Ayah (Verse) - API Response Format
// --------------------
export interface AyahApi {
  number: number; // Global ayah number (1-6236)
  text: string; // Arabic text or translation
  numberInSurah: number; // Ayah number within surah
  juz: number; // Juz number (1-30)
  manzil: number; // Manzil number (1-7)
  page: number; // Page number (1-604)
  ruku: number; // Ruku number (1-556)
  hizbQuarter: number; // Hizb quarter (1-240)
  sajda:
    | boolean
    | {
        id: number;
        recommended: boolean;
        obligatory: boolean;
      };
}

// --------------------
// Ayah (Verse) - UI Format
// --------------------
export interface Ayah {
  number: number; // Global ayah number
  surahArabicName: string;
  surahTranslation: string;
  text: string;
  translationText?: string; // Translation text for the ayah
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda:
    | boolean
    | {
        id: number;
        recommended: boolean;
        obligatory: boolean;
      };
}

// --------------------
// Surah - API Response Format
// --------------------
export interface SurahApi {
  number: number; // 1-114
  name: string; // Arabic name
  englishName: string;
  englishNameTranslation: string;
  revelationType: "Meccan" | "Medinan";
  numberOfAyahs: number;
  ayahs: AyahApi[];
}

// --------------------
// Surah - UI Format
// --------------------

export interface Surah {
  number: number;
  name: string; // Arabic name
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  ayahs: Ayah[];
}

// --------------------
// Quran Edition (Arabic / Translation / Audio)
// --------------------
export interface QuranEdition {
  identifier: string; // e.g. "en.asad", "quran-uthmani", "ar.alafasy"
  language: string; // "ar", "tr", "en", "fr", etc.
  name: string;
  englishName: string;
  format: "text" | "audio";
  type: "quran" | "translation" | "tafsir" | "versebyverse";
  direction?: "rtl" | "ltr";
}

// --------------------
// Base API Response
// --------------------
export interface QuranApiResponse<T = unknown> {
  code: number;
  status: string;
  data: T;
}

// --------------------
// Complete Quran Response
// --------------------
export interface CompleteQuranResponse {
  surahs: SurahApi[];
  edition: QuranEdition;
}

// --------------------
// Single Surah Response
// --------------------
export interface SurahResponse {
  surah: SurahApi;
  edition: QuranEdition;
}

// --------------------
// Multiple Editions Response
// --------------------
export interface MultipleEditionsResponse {
  surah: SurahApi;
  editions: QuranEdition[];
}

// --------------------
// Single Ayah Response
// --------------------
export interface AyahResponse {
  ayah: AyahApi;
  edition: QuranEdition;
  surah: {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    revelationType: "Meccan" | "Medinan";
    numberOfAyahs: number;
  };
}

// --------------------
// Juz Response
// --------------------
export interface JuzResponse {
  juz: {
    number: number;
    ayahs: AyahApi[];
  };
  edition: QuranEdition;
}

// --------------------
// Page Response
// --------------------
export interface PageResponse {
  page: {
    number: number;
    ayahs: AyahApi[];
  };
  edition: QuranEdition;
}

// --------------------
// Manzil Response
// --------------------
export interface ManzilResponse {
  manzil: {
    number: number;
    ayahs: AyahApi[];
  };
  edition: QuranEdition;
}

// --------------------
// Ruku Response
// --------------------
export interface RukuResponse {
  ruku: {
    number: number;
    ayahs: AyahApi[];
  };
  edition: QuranEdition;
}

// --------------------
// Hizb Quarter Response
// --------------------
export interface HizbQuarterResponse {
  hizbQuarter: {
    number: number;
    ayahs: AyahApi[];
  };
  edition: QuranEdition;
}

// --------------------
// Sajda Response
// --------------------
export interface SajdaResponse {
  sajdas: AyahApi[];
  edition: QuranEdition;
}

// --------------------
// Search Response
// --------------------
export interface SearchResponse {
  search: {
    query: string;
    surah: number | "all";
    edition: string;
    results: Array<{
      ayah: AyahApi;
      surah: {
        number: number;
        name: string;
        englishName: string;
        englishNameTranslation: string;
      };
    }>;
  };
}

// --------------------
// Meta Response
// --------------------
export interface MetaResponse {
  surahs: Array<{
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    revelationType: "Meccan" | "Medinan";
    numberOfAyahs: number;
  }>;
  pages: Array<{
    number: number;
    ayahs: number[];
  }>;
  hizbQuarters: Array<{
    number: number;
    ayahs: number[];
  }>;
  juzs: Array<{
    number: number;
    ayahs: number[];
  }>;
}

export type SurahItem = {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation?: string;
  ayahs: Ayah[];
};
