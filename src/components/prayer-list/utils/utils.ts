import { PrayerItem, PrayerTimings } from "@/components/prayer-list/types/prayer-timings";

/**
 * Aladhan "05:52 (+03)" gibi zamanları "05:52"e çevirir; parse ve gösterim için.
 */
export function normalizeTimeString(time: string): string {
  const match = /^\d{1,2}:\d{2}(?::\d{2})?/.exec(time.trim());
  return match ? match[0] : time;
}

/**
 * Vakit zamanını Date objesine çevirir (timezone soneki desteklenir, örn. "05:52 (+03)")
 */
export function createPrayerTime(time: string, baseDate: Date): Date {
  const normalized = normalizeTimeString(time);
  const [hours, minutes] = normalized.split(":").map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

/**
 * Dünün vakit zamanlarını hesaplar (Imsak'tan önceki saatler için)
 */
export function getYesterdayPrayerTimes(
  currentPrayer: PrayerItem,
  currentPrayerIndex: number,
  sortedPrayers: PrayerItem[],
  yesterday: Date,
  imsakTime: Date
): { currentPrayerTime: Date; nextPrayerTime: Date } {
  const currentPrayerTime = createPrayerTime(currentPrayer.time, yesterday);
  const nextPrayerIndex = currentPrayerIndex + 1;

  let nextPrayerTime: Date;
  if (nextPrayerIndex < sortedPrayers.length) {
    const nextPrayer = sortedPrayers[nextPrayerIndex];
    nextPrayerTime = createPrayerTime(nextPrayer.time, yesterday);
  } else {
    nextPrayerTime = imsakTime;
  }

  return { currentPrayerTime, nextPrayerTime };
}

/**
 * Bugünün vakit zamanlarını hesaplar
 */
export function getTodayPrayerTimes(
  currentPrayer: PrayerItem,
  currentPrayerIndex: number,
  sortedPrayers: PrayerItem[],
  today: Date
): { currentPrayerTime: Date; nextPrayerTime: Date } {
  const currentPrayerTime = createPrayerTime(currentPrayer.time, today);
  const nextPrayerIndex = currentPrayerIndex + 1;

  let nextPrayerTime: Date;
  if (nextPrayerIndex < sortedPrayers.length) {
    const nextPrayer = sortedPrayers[nextPrayerIndex];
    nextPrayerTime = createPrayerTime(nextPrayer.time, today);
  } else {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowFirstPrayer = sortedPrayers[0];
    if (tomorrowFirstPrayer) {
      nextPrayerTime = createPrayerTime(tomorrowFirstPrayer.time, tomorrow);
    } else {
      nextPrayerTime = new Date(currentPrayerTime);
      nextPrayerTime.setDate(nextPrayerTime.getDate() + 1);
    }
  }

  return { currentPrayerTime, nextPrayerTime };
}

/** Namaz sırası - listede olan ana vakitler */
const PRAYER_ORDER = [
  "Imsak",
  "Fajr",
  "Sunrise",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
] as const;

/**
 * Şu anki saatin hangi namaz vakti aralığında olduğunu ve vakitlerin geçip geçmediğini belirler
 */
export function getPrayerStatus(
  prayerKey: string,
  allPrayers: PrayerItem[]
): { isPast: boolean; isActive: boolean } {
  const now = new Date();

  const sortedPrayers = PRAYER_ORDER.map((key) =>
    allPrayers.find((p) => p.key === key)
  ).filter((p): p is PrayerItem => p !== undefined);

  if (sortedPrayers.length === 0) {
    return { isPast: false, isActive: false };
  }

  const firstPrayer = sortedPrayers[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  today.setSeconds(0);
  today.setMilliseconds(0);

  const firstPrayerTime = createPrayerTime(firstPrayer.time, today);
  const isBeforeFirstPrayer = now.getTime() < firstPrayerTime.getTime();

  const currentPrayerIndex = sortedPrayers.findIndex(
    (p) => p.key === prayerKey
  );
  if (currentPrayerIndex === -1) {
    return { isPast: false, isActive: false };
  }

  const currentPrayer = sortedPrayers[currentPrayerIndex];
  let currentPrayerTime: Date;
  let nextPrayerTime: Date;

  if (isBeforeFirstPrayer) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const times = getYesterdayPrayerTimes(
      currentPrayer,
      currentPrayerIndex,
      sortedPrayers,
      yesterday,
      firstPrayerTime
    );
    currentPrayerTime = times.currentPrayerTime;
    nextPrayerTime = times.nextPrayerTime;
  } else {
    const times = getTodayPrayerTimes(
      currentPrayer,
      currentPrayerIndex,
      sortedPrayers,
      today
    );
    currentPrayerTime = times.currentPrayerTime;
    nextPrayerTime = times.nextPrayerTime;
  }

  const isPast = now.getTime() > currentPrayerTime.getTime();
  const isActive =
    now.getTime() >= currentPrayerTime.getTime() &&
    now.getTime() < nextPrayerTime.getTime();

  return { isPast, isActive };
}

export function transformPrayerTimings(
  prayerMap: Record<
    string,
    { name: string; key: string; meaning: string; icon: string }
  >,
  timings: PrayerTimings | undefined
): PrayerItem[] {
  if (!timings) {
    return [];
  }

  return Object.entries(timings)
    .filter(([key]) => prayerMap[key])
    .map(([key, time]) => ({
      name: prayerMap[key].name,
      time,
      key: prayerMap[key].key,
      meaning: prayerMap[key].meaning,
      icon: prayerMap[key].icon,
    }));
}
