export type PrayerTimings = {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;

  Midnight: string;
  Firstthird: string;
  Lastthird: string;
};

export type PrayerItem = {
  readonly name: string;
  readonly time: string;
  readonly key: string;
  readonly meaning: string;
  readonly icon: string;
};
