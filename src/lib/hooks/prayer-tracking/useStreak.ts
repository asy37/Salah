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
import type { PrayerStreak } from '@/types/prayer-tracking';

const STALE_MS = 90 * 1000;

export function useStreak() {
  const effectiveToday = getEffectiveToday();

  return useQuery<PrayerStreak>({
    queryKey: ['prayerStreak', effectiveToday],
    queryFn: async () => {
      const logs: PrayerLogRow[] = await getPrayerLogsRecent();
      const count = calculateStreakFromSupabaseLogs(logs, effectiveToday);
      return { count };
    },
    staleTime: STALE_MS,
    gcTime: 5 * 60 * 1000,
  });
}
