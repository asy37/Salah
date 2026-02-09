import { useMemo } from "react";
import { SurahType } from "../types/types";

export const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // aksanları sil
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .trim();

export const useSearchableSurahs = (SurahData: SurahType[]) => {
  const data = useMemo(() => {
    return SurahData.map((surah) => {
      const combinedText = [
        surah.surahArabicName,
        surah.surahEnglishName,
        surah.surahTurkishName,
        String(surah.surahNumber),
      ]
        .filter(Boolean)
        .join(" ");

      return {
        ...surah,
        searchableText: normalizeText(combinedText),
      };
    });
  }, []);
  return data;
};
export const useFilteredSurahs = (
  searchableSurahs: SurahType[],
  search: string
) => {
  const data = useMemo(() => {
    if (!search.trim()) return searchableSurahs;

    const normalizedSearch = normalizeText(search);

    return searchableSurahs.filter((surah) =>
      surah?.searchableText?.includes(normalizedSearch)
    );
  }, [search, searchableSurahs]);
  return data;
};

export const LANGUAGE_LABELS: Record<string, string> = {
  ar: "Arapça",
  am: "Amharca",
  az: "Azerice",
  ber: "Berberice",
  bn: "Bengalce",
  cs: "Çekçe",
  ce: "Çeçence",
  de: "Almanca",
  dv: "Divehi dili",
  en: "İngilizce",
  es: "İspanyolca",
  fa: "Farsça",
  fr: "Fransızca",
  ha: "Hausa dili",
  hi: "Hintçe",
  id: "Endonezyaca",
  it: "İtalyanca",
  ja: "Japonca",
  ko: "Korece",
  ku: "Kürtçe",
  ml: "Malayalam",
  nl: "Felemenkçe",
  no: "Norveççe",
  pl: "Lehçe",
  ps: "Peştuca",
  pt: "Portekizce",
  ro: "Romence",
  ru: "Rusça",
  sd: "Sindhi",
  so: "Somalice",
  sq: "Arnavutça",
  sv: "İsveççe",
  sw: "Svahili",
  ta: "Tamilce",
  tg: "Tacikçe",
  th: "Tayca",
  tr: "Türkçe",
  tt: "Tatarca",
  ug: "Uygurca",
  ur: "Urduca",
  uz: "Özbekçe",
};

export const formatTime = (millis: number) => {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const progressPercentage = (duration: number, position: number) => {
  return duration > 0 ? (position / duration) * 100 : 0;
};
