import { startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { dhikrRepo } from "./repository";

export async function getDhikrStatsSummary(userId: string | null) {
  if (!userId) return null;

  const now = new Date();

  const weekStart = startOfWeek(now).getTime();
  const monthStart = startOfMonth(now).getTime();
  const yearStart = startOfYear(now).getTime();

  const nowTs = now.getTime();

  return {
    week: await dhikrRepo.getDhikrStats(userId, weekStart, nowTs),
    month: await dhikrRepo.getDhikrStats(userId, monthStart, nowTs),
    year: await dhikrRepo.getDhikrStats(userId, yearStart, nowTs),
  };
}