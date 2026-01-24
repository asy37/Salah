/**
 * Duas Hook
 * 
 * Manages duas list with offline-first persistence
 * - Loads duas from SQLite
 * - Handles CRUD operations
 * - Automatically syncs to queue when offline
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { duaRepo } from '@/lib/database/sqlite/dua/repository';
import { useUserId } from '@/lib/hooks/auth/useUser';
import { generateUUID } from '@/lib/utils/uuid';
import { isOnline } from '@/lib/utils/network';
import type { Dua } from '@/types/dua';

/**
 * Hook for managing duas list
 * 
 * @returns Duas state and handlers
 */
export function useDuas() {
  const { userId, isLoading: isUserIdLoading } = useUserId();
  const [duas, setDuas] = useState<Dua[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const previousUserIdRef = useRef<string | null>(null);
  const loadDuasRef = useRef<(() => Promise<void>) | null>(null);
  const isLoadingRef = useRef(false);
  
  // Update previousUserIdRef when userId changes
  useEffect(() => {
    if (userId) {
      previousUserIdRef.current = userId;
    }
  }, [userId]);
  
  // Load duas from SQLite
  const loadDuas = useCallback(async () => {
    // Don't load if userId is still loading or is null (might be temporary)
    if (isUserIdLoading || !userId) {
      // Don't clear duas - wait for userId to be ready
      return;
    }

    // Prevent concurrent loads
    if (isLoadingRef.current) {
      return;
    }

    // If userId changed (not just initialized), clear old duas
    const prevUserId = previousUserIdRef.current;
    if (prevUserId !== null && prevUserId !== userId) {
      // Don't clear duas here - let the new load set it
    }

    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      const loadedDuas = await duaRepo.getAllDuas(userId);
      // Create a new array reference to ensure React detects the change
      setDuas([...loadedDuas]);
    } catch (error) {
      console.error('[useDuas] Error loading duas:', error);
      setDuas([]);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [userId, isUserIdLoading]);
  
  // Store loadDuas in ref so it can be called from other callbacks without dependency issues
  useEffect(() => {
    loadDuasRef.current = loadDuas;
  }, [loadDuas]);

  // Load on mount and when userId changes (but only if userId is ready)
  useEffect(() => {
    if (!isUserIdLoading && userId) {
      // Use ref to avoid stale closure issues
      if (loadDuasRef.current) {
        loadDuasRef.current();
      } else {
        // If loadDuasRef is null, we can't load, so stop loading
        setIsLoading(false);
      }
    } else if (!isUserIdLoading && !userId) {
      // If userId loading is done but userId is still null, stop loading
      setIsLoading(false);
    }
    // If userId is loading, keep isLoading true (initial state)
  }, [isUserIdLoading, userId]);


  // Create new dua
  const createDua = useCallback(
    async (title: string, text: string, isFavorite: boolean = false) => {
      if (!userId || isSaving) {
        return;
      }

      try {
        setIsSaving(true);
        const now = Date.now();
        const newDua: Dua = {
          id: generateUUID(),
          user_id: userId,
          title: title.trim(),
          text: text.trim(),
          is_favorite: isFavorite,
          created_at: now,
          updated_at: now,
        };

        const online = await isOnline();
        await duaRepo.createDua(newDua, online);

        // Optimistically update state instead of reloading
        setDuas((prev) => {
          return [newDua, ...prev];
        });
      } catch (error) {
        console.error('[useDuas] Error creating dua:', error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [userId, isSaving]
  );

  // Update existing dua
  const updateDua = useCallback(
    async (duaId: string, updates: { title?: string; text?: string; is_favorite?: boolean }) => {
      if (!userId || isSaving) return;

      try {
        setIsSaving(true);
        const existingDua = await duaRepo.getDuaById(duaId, userId);
        if (!existingDua) {
          throw new Error('Dua not found');
        }

        const updatedDua: Dua = {
          ...existingDua,
          ...updates,
          updated_at: Date.now(),
        };

        const online = await isOnline();
        await duaRepo.updateDua(updatedDua, online);

        // Optimistically update state instead of reloading
        setDuas((prev) => {
          const index = prev.findIndex((d) => d.id === duaId);
          if (index === -1) return prev;
          const updated = [...prev];
          updated[index] = updatedDua;
          return updated;
        });
      } catch (error) {
        console.error('[useDuas] Error updating dua:', error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [userId, isSaving]
  );

  // Delete dua
  const deleteDua = useCallback(
    async (duaId: string) => {
      if (!userId || isSaving) return;

      try {
        setIsSaving(true);
        const online = await isOnline();
        await duaRepo.deleteDua(duaId, userId, online);

        // Optimistically update state instead of reloading
        setDuas((prev) => prev.filter((d) => d.id !== duaId));
      } catch (error) {
        console.error('[useDuas] Error deleting dua:', error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [userId, isSaving]
  );

  // Toggle favorite
  const toggleFavorite = useCallback(
    async (duaId: string) => {
      const dua = duas.find((d) => d.id === duaId);
      if (!dua) return;

      await updateDua(duaId, { is_favorite: !dua.is_favorite });
    },
    [duas, updateDua]
  );

  return {
    duas,
    isLoading,
    isSaving,
    createDua,
    updateDua,
    deleteDua,
    toggleFavorite,
    reload: loadDuas,
  };
}
