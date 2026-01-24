/**
 * Dhikr Hook
 * 
 * Manages dhikr state with offline-first persistence
 * - In-memory state for fast increments
 * - Persists to SQLite on changes
 * - Marks records as dirty for sync
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { dhikrRepo } from '@/lib/database/sqlite/dhikr/repository';
import { getDb } from '@/lib/database/sqlite/db';
import { useAuth } from '@/lib/hooks/auth/useAuth';
import type { Dhikr } from '@/types/dhikir';

/**
 * Hook for managing a single dhikr
 * 
 * @param slug - Dhikr slug identifier
 * @returns Dhikr state and handlers
 */
export function useDhikr(slug: string | null) {
  const { user } = useAuth();
  const userId = user?.id || null;
  
  const [dhikr, setDhikr] = useState<Dhikr | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isSavingRef = useRef(false);
  const prevSlugRef = useRef<string | null>(null);
  const prevDhikrRef = useRef<Dhikr | null>(null);

  // Initialize database on mount
  useEffect(() => {
    getDb().catch((error) => {
      console.error('[useDhikr] Database initialization error:', error);
    });
  }, []);

  // Load dhikr from SQLite
  const load = useCallback(async () => {
    if (!slug || !userId) {
      setDhikr(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const record = await dhikrRepo.getDhikrBySlug(userId, slug);
      
      if (record) {
        // Convert DhikrRecord to Dhikr (exclude user_id, is_dirty, last_synced_at)
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
      } else {
        setDhikr(null);
      }
    } catch (error) {
      console.error('[useDhikr] Error loading dhikr:', error);
      setDhikr(null);
    } finally {
      setIsLoading(false);
    }
  }, [slug, userId]);

  // Save dhikr to SQLite
  const saveToDb = useCallback(
    async (data: Dhikr | null) => {
      if (!data || !userId || isSavingRef.current) return;

      try {
        isSavingRef.current = true;

        // Convert Dhikr to DhikrRecord (add user_id, is_dirty, updated_at)
        await dhikrRepo.upsertDhikr({
          id: data.id,
          user_id: userId,
          slug: data.slug,
          label: data.label,
          target_count: data.target_count,
          current_count: data.current_count,
          status: data.status,
          started_at: data.started_at,
          completed_at: data.completed_at,
          is_dirty: true, // Mark as dirty for sync
          last_synced_at: null,
          updated_at: Date.now(),
        });
      } catch (error) {
        console.error('[useDhikr] Error saving dhikr:', error);
      } finally {
        isSavingRef.current = false;
      }
    },
    [userId]
  );

  // Save previous dhikr when slug changes
  useEffect(() => {
    // If slug changed and we have a previous dhikr, save it
    if (prevSlugRef.current !== null && prevSlugRef.current !== slug && prevDhikrRef.current) {
      saveToDb(prevDhikrRef.current).catch(console.error);
    }

    // Update refs
    prevSlugRef.current = slug;
    if (dhikr) {
      prevDhikrRef.current = dhikr;
    }
  }, [slug, dhikr, saveToDb]);

  // Load on mount and when slug/userId changes
  useEffect(() => {
    load();
  }, [load]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (dhikr) {
        saveToDb(dhikr).catch(console.error);
      }
    };
  }, [dhikr, saveToDb]);

  // Save when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (dhikr) {
          saveToDb(dhikr).catch(console.error);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [dhikr, saveToDb]);

  // Increment counter
  const increment = useCallback(() => {
    setDhikr((prev) => {
      if (!prev || prev.status === 'completed') return prev;

      const newCount = prev.current_count + 1;
      const isCompleted = newCount >= prev.target_count;

      return {
        ...prev,
        current_count: isCompleted ? prev.target_count : newCount,
        status: isCompleted ? 'completed' : 'active',
        completed_at: isCompleted ? Date.now() : prev.completed_at,
      };
    });
  }, []);

  // Reset dhikr
  const reset = useCallback(() => {
    setDhikr((prev) => {
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
    reload: load,
  };
}
