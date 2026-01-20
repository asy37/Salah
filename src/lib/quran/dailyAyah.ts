const TOTAL_AYAH = 6236;

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash | 0;
  }
  return Math.abs(hash);
}

/**
 * Tarih bazlı deterministik ayet numarası (1–6236).
 * Aynı gün aynı ayet, farklı gün farklı ayet döner.
 */
export function getDailyAyahNumber(date = new Date()): number {
  const yyyyMMdd = date.toISOString().slice(0, 10); // 2024-03-24
  const hash = simpleHash(yyyyMMdd);
  return (hash % TOTAL_AYAH) + 1;
}
