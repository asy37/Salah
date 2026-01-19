import { useEffect, useState } from "react";
import { useAuth } from "../useAuth";
import { useUserId } from "../useUser";
import { getDhikrStatsSummary } from "@/lib/database/sqlite/dhikr/stats.service";
import { DhikrStats } from "@/types/dhikir";

export function useDhikrStats() {
  const { user } = useAuth();
  const { userId } = useUserId();
  const userIdToUse = user?.id ?? userId;

  const [stats, setStats] = useState<DhikrStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userIdToUse) {
      setLoading(false);
      setStats(null);
      return;
    }

    async function load() {
      setLoading(true);
      const data = await getDhikrStatsSummary(userIdToUse);
      setStats(data);
      setLoading(false);
    }

    load();
  }, [userIdToUse]);

  return { stats, loading };
}