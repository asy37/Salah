  import { PrayerItem, PrayerTimings } from "@/components/prayer-list/types/prayer-timings";

/**
 * Vakit zamanını Date objesine çevirir
 */
export function createPrayerTime(time: string, baseDate: Date): Date {
  const [hours, minutes] = time.split(":").map(Number);
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
    const tomorrowImsak = sortedPrayers.find((p) => p.key === "Imsak");
    if (tomorrowImsak) {
      nextPrayerTime = createPrayerTime(tomorrowImsak.time, tomorrow);
    } else {
      nextPrayerTime = new Date(currentPrayerTime);
      nextPrayerTime.setDate(nextPrayerTime.getDate() + 1);
    }
  }

  return { currentPrayerTime, nextPrayerTime };
}

/**
 * Şu anki saatin hangi namaz vakti aralığında olduğunu ve vakitlerin geçip geçmediğini belirler
 */
export function getPrayerStatus(
  prayerKey: string,
  allPrayers: PrayerItem[]
): { isPast: boolean; isActive: boolean } {
  const now = new Date();
  const prayerOrder = ["Imsak", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

  const sortedPrayers = prayerOrder
    .map((key) => allPrayers.find((p) => p.key === key))
    .filter((p): p is PrayerItem => p !== undefined);

  if (sortedPrayers.length === 0) {
    return { isPast: false, isActive: false };
  }

  const imsakPrayer = sortedPrayers.find((p) => p.key === "Imsak");
  if (!imsakPrayer) {
    return { isPast: false, isActive: false };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  today.setSeconds(0);
  today.setMilliseconds(0);

  const imsakTime = createPrayerTime(imsakPrayer.time, today);
  const isBeforeImsak = now.getTime() < imsakTime.getTime();

  const currentPrayerIndex = sortedPrayers.findIndex(
    (p) => p.key === prayerKey
  );
  if (currentPrayerIndex === -1) {
    return { isPast: false, isActive: false };
  }

  const currentPrayer = sortedPrayers[currentPrayerIndex];
  let currentPrayerTime: Date;
  let nextPrayerTime: Date;

  if (isBeforeImsak) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const times = getYesterdayPrayerTimes(
      currentPrayer,
      currentPrayerIndex,
      sortedPrayers,
      yesterday,
      imsakTime
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
