/**
 * Prayer Times Hook
 * Fetches prayer times from Aladhan API using TanStack Query
 */

import { useQuery } from '@tanstack/react-query';
import { fetchPrayerTimes, type PrayerTimesParams } from '@/lib/api/services/prayerTimes';
import { queryKeys } from '@/lib/query/queryKeys';
import { useLocationStore } from '../../storage/locationStore';
import { getTodayDDMMYYYY } from '@/lib/services/dailyReset';

export function usePrayerTimes(params: PrayerTimesParams) {
  const location = useLocationStore((state) => state.location);

  // Manuel lokasyon varsa onu kullan, yoksa GPS lokasyonu, yoksa default (Istanbul)
  const latitudeLocation = location?.latitude ?? 41.0082;
  const longitudeLocation = location?.longitude ?? 28.9784;

  // Query key ve fetch tutarlı olsun: date yoksa bugün (DD-MM-YYYY)
  const effectiveDate = params.date ?? getTodayDDMMYYYY();

  const updatedParams: PrayerTimesParams = {
    ...params,
    latitude: latitudeLocation,
    longitude: longitudeLocation,
    date: effectiveDate,
  };

  return useQuery({
    queryKey: queryKeys.prayerTimes.byLocation(
      latitudeLocation,
      longitudeLocation,
      effectiveDate,
      params.method,
      params.calendarMethod
    ),
    queryFn: () => fetchPrayerTimes(updatedParams),
    staleTime: 24 * 60 * 60 * 1000, // 24 saat (günlük veri)
    gcTime: 24 * 60 * 60 * 1000, // 24 saat cache
  });
}
