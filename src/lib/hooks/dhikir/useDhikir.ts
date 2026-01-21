import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { dhikrRepo } from '@/lib/database/sqlite/dhikr/repository';
import { useAuth } from '../auth/useAuth';
import { useUserId } from '../auth/useUser';
import type { Dhikr } from '@/types/dhikir';

/**
 * useDhikrCounter
 *
 * - Memory is the single source of truth
 * - SQLite is only for persistence
 * - No TanStack Query
 * - Offline-first, safe, deterministic
 */
export function useDhikrCounter(slug: string) {
  const { user } = useAuth();
  const { userId } = useUserId();
  const userIdToUse = user?.id ?? userId;

  const [dhikr, setDhikr] = useState<Dhikr | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isSavingRef = useRef(false);

  /* -------------------------
   * LOAD FROM SQLITE (ONCE)
   * ------------------------- */
  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!userIdToUse) return;

      const record = await dhikrRepo.getDhikrBySlug(userIdToUse, slug);

      if (mounted && record) {
        // user_id'yi çıkar, sadece frontend tipine uygun alanları al
        setDhikr({
          id: record.id,
          slug: record.slug,
          label: record.label,
          target_count: record.target_count,
          current_count: record.current_count,
          status: record.status,
          started_at: record.started_at,
          completed_at: record.completed_at,
        });
      }

      if (mounted) setIsLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [slug, userIdToUse]);

  /* -------------------------
   * SAVE TO SQLITE (SAFE)
   * ------------------------- */
  const saveToDb = useCallback(
    async (data: Dhikr | null) => {
      if (!data || !userIdToUse || isSavingRef.current) return;

      try {
        isSavingRef.current = true;

        // user_id'yi burada ekle (sadece persistence için)
        await dhikrRepo.upsertDhikr({
          ...data,
          user_id: userIdToUse, // Sadece burada ekleniyor
          is_dirty: true,
          updated_at: Date.now(),
          last_synced_at: null,
        });
      } finally {
        isSavingRef.current = false;
      }
    },
    [userIdToUse]
  );

  /* -------------------------
   * SAVE ON UNMOUNT
   * ------------------------- */
  useEffect(() => {
    return () => {
      saveToDb(dhikr);
    };
  }, [dhikr, saveToDb]);

  /* -------------------------
   * SAVE ON BACKGROUND
   * ------------------------- */
  useEffect(() => {
    const sub = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if ((state === 'background' || state === 'inactive') && dhikr) {
          saveToDb(dhikr);
        }
      }
    );

    return () => sub.remove();
  }, [dhikr, saveToDb]);

  /* -------------------------
   * INCREMENT (MEMORY ONLY)
   * ------------------------- */
  const increment = useCallback(() => {
    setDhikr(prev => {
      if (!prev || prev.status === 'completed') return prev;

      const nextCount = prev.current_count + 1;
      const completed = nextCount >= prev.target_count;

      return {
        ...prev,
        current_count: completed ? prev.target_count : nextCount,
        status: completed ? 'completed' : 'active',
        completed_at: completed ? Date.now() : prev.completed_at,
      };
    });
  }, []);

  /* -------------------------
   * RESET (MEMORY ONLY)
   * ------------------------- */
  const reset = useCallback(() => {
    setDhikr(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        current_count: 0,
        status: 'active',
        started_at: Date.now(),
        completed_at: null,
      };
    });
  }, []);

  return {
    dhikr,
    isLoading,
    increment,
    reset,
  };
}