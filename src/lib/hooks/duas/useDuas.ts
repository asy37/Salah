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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDuas.ts:29',message:'loadDuas entry',data:{userId,isUserIdLoading,previousUserId:previousUserIdRef.current,isLoading:isLoadingRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // Don't load if userId is still loading or is null (might be temporary)
    if (isUserIdLoading || !userId) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDuas.ts:35',message:'loadDuas skipped - userId loading or null',data:{isUserIdLoading,userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      // Don't clear duas - wait for userId to be ready
      return;
    }

    // Prevent concurrent loads
    if (isLoadingRef.current) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDuas.ts:44',message:'loadDuas skipped - already loading',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      return;
    }

    // If userId changed (not just initialized), clear old duas
    const prevUserId = previousUserIdRef.current;
    if (prevUserId !== null && prevUserId !== userId) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDuas.ts:42',message:'userId changed - clearing duas',data:{previousUserId:prevUserId,newUserId:userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      // Don't clear duas here - let the new load set it
    }

    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDuas.ts:38',message:'before getAllDuas call',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const loadedDuas = await duaRepo.getAllDuas(userId);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDuas.ts:39',message:'after getAllDuas call',data:{loadedCount:loadedDuas.length,loadedIds:loadedDuas.map(d=>d.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDuas.ts:40',message:'before setDuas call',data:{newDuasCount:loadedDuas.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // Create a new array reference to ensure React detects the change
      setDuas([...loadedDuas]);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDuas.ts:41',message:'after setDuas call',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDuas.ts:43',message:'loadDuas error',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
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
      }
    }
  }, [isUserIdLoading, userId]);

  // Track duas state changes
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDuas.ts:52',message:'duas state changed',data:{duasCount:duas.length,duasIds:duas.map(d=>d.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  }, [duas]);

  // Create new dua
  const createDua = useCallback(
    async (title: string, text: string, isFavorite: boolean = false) => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDuas.ts:54',message:'createDua entry',data:{title,text,isFavorite,userId,isSaving},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      if (!userId || isSaving) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDuas.ts:57',message:'createDua early return',data:{userId,isSaving},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDuas.ts:70',message:'before createDua repo call',data:{newDua},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        const online = await isOnline();
        await duaRepo.createDua(newDua, online);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDuas.ts:73',message:'after createDua repo call',data:{online},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        // Optimistically update state instead of reloading
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDuas.ts:76',message:'before optimistic update',data:{newDuaId:newDua.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        setDuas((prev) => {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDuas.ts:79',message:'optimistic update',data:{prevCount:prev.length,newDuaId:newDua.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          return [newDua, ...prev];
        });
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDuas.ts:82',message:'after optimistic update',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDuas.ts:80',message:'createDua error',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
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
