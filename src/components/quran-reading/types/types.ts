export type SurahType = {
  readonly id: number;
  readonly surahArabicName: string;
  readonly surahEnglishName: string;
  readonly surahTurkishName: string;
  readonly ayahCount: number;
  readonly surahNumber: number;
  readonly startPage: number;
  readonly searchableText?: string;
};
