import { useCallback, useEffect, useMemo } from "react";
import { Surah, Ayah, SurahItem } from "@/types/quran";
import {
  useAudioStore,
  usePageStore,
  useSurahStore,
  useTranslationStore,
} from "@/lib/storage/useQuranStore";
import { getDailyAyahNumber } from "@/lib/quran/dailyAyah";

const AYAH_PER_PAGE = 10;

export function useQuran(
  quranData: unknown,
  initialSurahNumber = 1,
) {
  const {
    currentSurahNumber: storeSurahNumber,
    currentPageIndex: storePageIndex,
    setCurrentSurahNumber: setStoreSurahNumber,
    setCurrentPageIndex: setStorePageIndex,
  } = usePageStore();

  const { translationData } = useTranslationStore();

  const { setJuz, setSurahName, setSurahEnglishName, setSurahNumber } =
    useSurahStore();

  const { setAudioNumber, activeAyahNumber } = useAudioStore();
  // Store'dan değer al, yoksa initial değeri kullan
  const currentSurahNumber = storeSurahNumber ?? initialSurahNumber;
  const currentPageIndex = storePageIndex ?? 0;
  /** Aktif sure */
  const surah: Surah | undefined = useMemo(() => {
    const data = quranData as {
      surahs: Array<{
        name: string;
        englishName: string;
        number: number;
        ayahs: Ayah[];
      }>;
    };
    const found = data.surahs.find((s) => s.number === currentSurahNumber);
    return found as unknown as Surah | undefined;
  }, [currentSurahNumber, quranData]);

  // Store'u useEffect ile güncelle (render sırasında değil)
  useEffect(() => {
    if (surah) {
      setJuz(surah.ayahs[0]?.juz ?? 1);
      setSurahName(surah.name ?? "");
      setSurahEnglishName(surah.englishName ?? "");
      setSurahNumber(surah.number ?? 1);
    }
  }, [surah, setJuz, setSurahName, setSurahEnglishName, setSurahNumber]);

  /** Sure yoksa (edge case) */
  if (!surah) {
    throw new Error("Surah not found");
  }

  /** Ayetleri çevirilerle eşleştir */
  const enrichedAyahs: Ayah[] = useMemo(() => {
    const translationSurah = translationData?.surahs.find(
      (ts) => ts.number === currentSurahNumber
    );

    return surah.ayahs.map((arabicAyah) => {
      const translationAyah = translationSurah?.ayahs.find(
        (ta) => ta.numberInSurah === arabicAyah.numberInSurah
      );

      return {
        ...arabicAyah,
        translationText: translationAyah?.text,
      };
    });
  }, [surah, translationData, currentSurahNumber]);

  /**
   * Rastgele bir ayet döndürür.
   * - Önce rastgele sure (1–114), sonra o surenin içinden rastgele ayet seçilir.
   * - Çeviri varsa translationText ile zenginleştirilir.
   */
  const getRandomAyah = useCallback((): Ayah | null => {
    const data = quranData as {
      surahs?: Array<{
        number: number;
        name: string;
        englishName: string;
        englishNameTranslation?: string;
        ayahs: Ayah[];
      }>;
    };
    if (!data?.surahs?.length) return null;

    const surahIndex = Math.floor(Math.random() * data.surahs.length);
    const surahItem = data.surahs[surahIndex];
    if (!surahItem?.ayahs?.length) return null;

    const ayahIndex = Math.floor(Math.random() * surahItem.ayahs.length);
    const arabicAyah = surahItem.ayahs[ayahIndex];

    const translationSurah = translationData?.surahs?.find(
      (ts) => ts.number === surahItem.number
    );
    const translationAyah = translationSurah?.ayahs?.find(
      (ta) => ta.numberInSurah === arabicAyah.numberInSurah
    );

    return {
      ...arabicAyah,
      surahNumber: surahItem.number,
      surahArabicName: surahItem.name,
      surahTranslation:
        surahItem.englishNameTranslation ?? surahItem.englishName ?? "",
      translationText: translationAyah?.text,
    };
  }, [quranData, translationData]);

  /**
   * Küresel ayet numarasına (1–6236) göre ayet döndürür.
   * Çeviri varsa translationText ile zenginleştirilir.
   */
  const getAyahByNumber = useCallback(
    (globalAyahNumber: number): Ayah | null => {
      const data = quranData as { surahs?: SurahItem[] };
      if (!data?.surahs?.length) return null;

      for (const surahItem of data.surahs) {
        const arabicAyah = surahItem.ayahs?.find(
          (a) => a.number === globalAyahNumber
        );
        if (!arabicAyah) continue;

        const translationSurah = translationData?.surahs?.find(
          (ts) => ts.number === surahItem.number
        );
        const translationAyah = translationSurah?.ayahs?.find(
          (ta) => ta.numberInSurah === arabicAyah.numberInSurah
        );

        return {
          ...arabicAyah,
          surahNumber: surahItem.number,
          surahArabicName: surahItem.name,
          surahTranslation:
            surahItem.englishNameTranslation ?? surahItem.englishName ?? "",
          translationText: translationAyah?.text,
        };
      }
      return null;
    },
    [quranData, translationData]
  );

  /**
   * Günlük ayet: getDailyAyahNumber ile o güne özel deterministik ayet numarası
   * alınır, getAyahByNumber ile ayet bulunur. Aynı gün her zaman aynı ayet.
   */
  const getDailyAyah = useCallback(
    (date?: Date): Ayah | null => {
      const n = getDailyAyahNumber(date ?? new Date());
      return getAyahByNumber(282);
    },
    [getAyahByNumber]
  );

  /** Ayetleri sayfalara böl */
  const pages: Ayah[][] = useMemo(() => {
    const result: Ayah[][] = [];
    for (let i = 0; i < enrichedAyahs.length; i += AYAH_PER_PAGE) {
      result.push(enrichedAyahs.slice(i, i + AYAH_PER_PAGE));
    }
    return result;
  }, [enrichedAyahs]);

  /** Ekranda gösterilecek ayetler */
  const visibleAyahs = useMemo(() => {
    return pages[currentPageIndex] ?? [];
  }, [pages, currentPageIndex]);
  /** Next */
  const goNext = () => {
    if (currentPageIndex < pages.length - 1) {
      setStorePageIndex(currentPageIndex + 1);
      return;
    }

    // Sure sonu → sonraki sure
    const data = quranData as {
      surahs: Array<{
        number: number;
        ayahs: Ayah[];
      }>;
    };
    if (currentSurahNumber < data.surahs.length) {
      setStoreSurahNumber(currentSurahNumber + 1);
      setStorePageIndex(0);
    }
  };

  /** Prev */
  const goPrev = () => {
    if (currentPageIndex > 0) {
      setStorePageIndex(currentPageIndex - 1);
      return;
    }

    // Sure başı → önceki sure (son sayfa)
    if (currentSurahNumber > 1) {
      const data = quranData as {
        surahs: Array<{
          number: number;
          ayahs: Ayah[];
        }>;
      };
      const prevSurah = data.surahs.find(
        (s) => s.number === currentSurahNumber - 1
      ) as unknown as Surah | undefined;

      if (!prevSurah) return;

      const prevPageCount = Math.ceil(prevSurah.ayahs.length / AYAH_PER_PAGE);

      setStoreSurahNumber(currentSurahNumber - 1);
      setStorePageIndex(prevPageCount - 1);
    }
  };

  useEffect(() => {
    if (visibleAyahs.length > 0) {
      const next = visibleAyahs[0].number;
      // Eğer zaten aynı ayet aktifse veya aktif ayet seçilmişse tekrar set etmeyelim
      // (çeviri objesi referansı sık değişse bile sonsuz döngüyü engeller)
      if (activeAyahNumber === next) {
        return;
      }

      // Aktif ayet seçildiyse, sayfa değişse bile otomatik olarak başa çekmeyelim
      if (activeAyahNumber !== null && activeAyahNumber !== undefined) {
        return;
      }
      setAudioNumber(next);
    }
  }, [visibleAyahs, setAudioNumber, activeAyahNumber]);

  // Aktif ayetin page bilgisi farklıysa otomatik sayfa değişimi
  useEffect(() => {
    if (activeAyahNumber === null || activeAyahNumber === undefined) {
      return;
    }

    // Aktif ayeti bul
    const activeAyah = enrichedAyahs.find(
      (ayah) => ayah.number === activeAyahNumber
    );

    if (!activeAyah) return;

    // Mevcut sayfadaki ayetlerin page bilgisini kontrol et
    const currentPageAyahs = visibleAyahs;
    if (currentPageAyahs.length === 0) return;

    const currentPageNumber = currentPageAyahs[0]?.page;
    const activeAyahPage = activeAyah.page;

    // Eğer aktif ayetin page'i mevcut sayfadan farklıysa
    if (activeAyahPage !== currentPageNumber) {
      // Aktif ayetin hangi sayfada olduğunu bul (sure içindeki sayfa index'i)
      const targetPageIndex = pages.findIndex((page) =>
        page.some((ayah) => ayah.number === activeAyahNumber)
      );

      if (targetPageIndex >= 0 && targetPageIndex !== currentPageIndex) {
        // Doğru sayfaya geç
        setStorePageIndex(targetPageIndex);
      }
    }
  }, [activeAyahNumber, enrichedAyahs, visibleAyahs, pages, currentPageIndex, setStorePageIndex]);

  // setCurrentSurahNumber wrapper'ı - store'u günceller
  const setCurrentSurahNumber = (surahNumber: number) => {
    setStoreSurahNumber(surahNumber);
    setStorePageIndex(0); // Yeni sure'ye geçildiğinde ilk sayfaya dön
  };

  return {
    surah: {
      ...surah,
      ayahs: enrichedAyahs,
    },
    surahNumber: currentSurahNumber,
    pageIndex: currentPageIndex,
    totalPages: pages.length,
    ayahs: visibleAyahs,
    goNext,
    goPrev,
    setCurrentSurahNumber,
    getRandomAyah,
    getAyahByNumber,
    getDailyAyah,
  };
}
