/**
 * Streak from Supabase (authoritative). Uses effective Islamic date.
 */

import { useQuery } from '@tanstack/react-query';
import { getPrayerLogsRecent } from '@/lib/api/services/prayerTracking';
import { getEffectiveToday } from '@/lib/services/prayerDate';
import {
  calculateStreakFromSupabaseLogs,
  type PrayerLogRow,
} from '@/lib/services/streakCalculation';
import { prayerTrackingRepo } from '@/lib/database/sqlite/prayer-tracking/repository';
import type { PrayerStreak } from '@/types/prayer-tracking';

const STALE_MS = 90 * 1000;

export function useStreak() {
  const effectiveToday = getEffectiveToday();

  return useQuery<PrayerStreak>({
    queryKey: ['prayerStreak', effectiveToday],
    queryFn: async () => {
      const logs: PrayerLogRow[] = await getPrayerLogsRecent();
      const hasEffectiveToday = logs.some((r) => r.date === effectiveToday);
      let count = calculateStreakFromSupabaseLogs(logs, effectiveToday);
      let localStreak = 0;
      if (!hasEffectiveToday) {
        localStreak = await prayerTrackingRepo.calculateLocalStreak();
        if (count === 0) {
          count = localStreak;
        } else if (localStreak >= 1) {
          count += 1;
        }
      }
      return { count };
    },
    staleTime: STALE_MS,
    gcTime: 5 * 60 * 1000,
  });
}
