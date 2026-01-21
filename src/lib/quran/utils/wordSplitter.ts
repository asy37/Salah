/**
 * Arapça ayet metnini kelimelere bölen utility fonksiyonları
 * RTL kurallarına dikkat eder ve durakları normalize eder
 */
export type AyahWord = {
  raw: string;        // UI'da gösterilecek hali
  clean: string;      // Senkron için (vakıf temizlenmiş)
  isPause: boolean;   // Vakıf/durak mı?
};  
const WAQF_CHARS = /[ۖۗۘۙۚۛۜ]/g;
/**
 * Arapça metindeki durakları normalize eder
 * Bazı duraklar farklı Unicode karakterlerle temsil edilebilir
 */
function normalizeDiacritics(text: string): string {
  return text
    .normalize("NFC") // Unicode normalization
    .replace(/\u0640/g, "") // Tatweel (elongation) karakterini kaldır
    .trim();
}

/**
 * Arapça ayet metnini kelimelere böler
 * RTL kurallarına uygun şekilde kelimeleri ayırır
 * 
 * @param text - Arapça ayet metni
 * @returns Kelime dizisi (RTL sırasında)
 */
export function splitAyahText(text: string): AyahWord[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const normalized = normalizeDiacritics(text);

  return normalized
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((raw) => {
      const clean = raw.replace(WAQF_CHARS, "");
      const isPause = clean.length === 0;

      return {
        raw,
        clean,
        isPause,
      };
    });
}

/**
 * Kelime dizisini tekrar birleştirir (test/debug için)
 */
export function joinAyahWords(words: AyahWord[]): string {
  return words.map(w => w.raw).join(" ");
}