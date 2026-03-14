/**
 * Streak calculation from Supabase prayer_logs (authoritative).
 * Islamic day boundary: use effectiveToday; never reset streak for incomplete today.
 */

export interface PrayerLogRow {
  date: string;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
}

const MAX_STREAK_DAYS = 10000;

function isDayComplete(log: PrayerLogRow): boolean {
  return (
    log.fajr === true &&
    log.dhuhr === true &&
    log.asr === true &&
    log.maghrib === true &&
    log.isha === true
  );
}

/**
 * Calculate streak from Supabase logs using effective Islamic today.
 * Does NOT reset streak when today is incomplete; only when yesterday is missing or incomplete.
 */
export function calculateStreakFromSupabaseLogs(
  logs: PrayerLogRow[],
  effectiveToday: string
): number {
  const byDate = new Map<string, PrayerLogRow>();
  for (const row of logs) {
    byDate.set(row.date, row);
  }

  const todayLog = byDate.get(effectiveToday);
  const todayComplete = todayLog != null && isDayComplete(todayLog);

  let startDate: string;
  if (todayComplete) {
    startDate = effectiveToday;
  } else {
    const yesterday = getPreviousDateString(effectiveToday);
    startDate = yesterday;
  }

  let streak = 0;
  let checkDate = startDate;
  let iterations = 0;

  while (iterations < MAX_STREAK_DAYS) {
    iterations++;
    const log = byDate.get(checkDate);
    if (log == null || !isDayComplete(log)) {
      break;
    }
    streak++;
    checkDate = getPreviousDateString(checkDate);
  }

  return streak;
}

export function getPreviousDateString(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  const py = date.getFullYear();
  const pm = String(date.getMonth() + 1).padStart(2, '0');
  const pd = String(date.getDate()).padStart(2, '0');
  return `${py}-${pm}-${pd}`;
}
