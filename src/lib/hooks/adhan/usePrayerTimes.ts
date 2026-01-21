/**
 * Prayer Times Hook
 * Fetches prayer times from Aladhan API using TanStack Query
 */

import { useQuery } from '@tanstack/react-query';
import { fetchPrayerTimes, type PrayerTimesParams } from '@/lib/api/services/prayerTimes';
import { queryKeys } from '@/lib/query/queryKeys';
import { useLocationStore } from '../storage/locationStore';

export function usePrayerTimes(params: PrayerTimesParams) {
    const location = useLocationStore((state) => state.location);

    // Manuel lokasyon varsa onu kullan, yoksa GPS lokasyonu, yoksa default (Istanbul)
    const latitudeLocation = location?.latitude ?? 41.0082;
    const longitudeLocation = location?.longitude ?? 28.9784;

    // Location store'daki değerleri kullanarak params'ı güncelle
    const updatedParams: PrayerTimesParams = {
      ...params,
      latitude: latitudeLocation,
      longitude: longitudeLocation,
    };
  
  return useQuery({
    queryKey: queryKeys.prayerTimes.byLocation(
        latitudeLocation,
        longitudeLocation,
      params.date,
      params.method,
      params.calendarMethod,
    ),
      queryFn: () => fetchPrayerTimes(updatedParams),
    staleTime: 24 * 60 * 60 * 1000, // 24 saat (günlük veri)
    gcTime: 24 * 60 * 60 * 1000, // 24 saat cache
  });
}
