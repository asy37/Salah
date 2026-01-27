/**
 * Dhikr Sync Service
 * Handles synchronization between SQLite (local) and Supabase (cloud)
 * 
 * Architecture:
 * - SQLite is the source of truth
 * - Only syncs dirty records (is_dirty = true)
 * - Only syncs for authenticated users (not guests)
 * - Syncs max once every 24 hours
 * - Never blocks UI
 * - Fails silently and retries later
 */

import { supabase } from '@/lib/supabase/client';
import { dhikrRepo, type DhikrRecord } from '@/lib/database/sqlite/dhikr/repository';
import { storage } from '@/lib/storage/mmkv';

const LAST_SYNC_KEY = 'dhikr_last_sync_timestamp';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface SyncResult {
  success: boolean;
  syncedCount: number;
  skippedCount: number;
  errorCount: number;
}

class DhikrSyncService {
  private isSyncing = false;

  private getSupabaseHostForDebug(): string | null {
    try {
      const raw = (supabase as any)?.supabaseUrl as string | undefined;
      if (!raw) return null;
      return new URL(raw).host;
    } catch {
      return null;
    }
  }

  private getSupabaseUrlForFetch(): string | null {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    return url && typeof url === 'string' ? url : null;
  }

  private getSupabaseAnonKeyForFetch(): string | null {
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    return key && typeof key === 'string' ? key : null;
  }

  private decodeJwtClaims(token: string): { exp?: number; iat?: number; iss?: string; aud?: string } {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return {};
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
      const json = JSON.parse(atob(padded));
      return {
        exp: typeof json.exp === 'number' ? json.exp : undefined,
        iat: typeof json.iat === 'number' ? json.iat : undefined,
        iss: typeof json.iss === 'string' ? json.iss : undefined,
        aud: typeof json.aud === 'string' ? json.aud : undefined,
      };
    } catch {
      return {};
    }
  }

  private decodeJwtHeader(token: string): { alg?: string; kid?: string; typ?: string } {
    try {
      const parts = token.split('.');
      if (parts.length < 1) return {};
      const header = parts[0].replace(/-/g, '+').replace(/_/g, '/');
      const padded = header + '='.repeat((4 - (header.length % 4)) % 4);
      const json = JSON.parse(atob(padded));
      return {
        alg: typeof json.alg === 'string' ? json.alg : undefined,
        kid: typeof json.kid === 'string' ? json.kid : undefined,
        typ: typeof json.typ === 'string' ? json.typ : undefined,
      };
    } catch {
      return {};
    }
  }

  private async invokeDhikrSyncViaFetch(
    accessToken: string,
    dhikrs: Array<ReturnType<DhikrSyncService['recordToSyncPayload']>>
  ): Promise<{ ok: boolean; status: number; bodyText: string }> {
    const baseUrl = this.getSupabaseUrlForFetch();
    const anonKey = this.getSupabaseAnonKeyForFetch();
    if (!baseUrl || !anonKey) {
      return { ok: false, status: 0, bodyText: 'Missing Supabase env' };
    }

    const endpoint = `${baseUrl.replace(/\/$/, '')}/functions/v1/sync_dhikr`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ dhikrs }),
    });

    const bodyText = await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, bodyText };
  }

  /**
   * Check if device is online
   */
  private async isOnline(): Promise<boolean> {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'B',location:'src/lib/services/dhikrSyncService.ts:isOnline',message:'isOnline start',data:{},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
      });
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'B',location:'src/lib/services/dhikrSyncService.ts:isOnline',message:'isOnline done',data:{hasResponse:!!response},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return true;
    } catch {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'B',location:'src/lib/services/dhikrSyncService.ts:isOnline',message:'isOnline failed',data:{},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return false;
    }
  }

  /**
   * Check if user is authenticated (not guest)
   */
  private async isAuthenticated(): Promise<boolean> {
    try {
      // IMPORTANT:
      // getSession() may return a locally-cached session even if the JWT is no longer valid
      // for the currently configured Supabase project (e.g. project URL/key changed).
      // getUser() forces validation against Supabase and prevents "Invalid JWT" at runtime.
      const { data: { user }, error } = await supabase.auth.getUser();
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'C',location:'src/lib/services/dhikrSyncService.ts:isAuthenticated',message:'getUser result',data:{hasUser:!!user,errorMessage:error?.message ?? null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      if (error) {
        // Clear invalid cached session so the app can recover via fresh login.
        await supabase.auth.signOut();
        return false;
      }

      return !!user;
    } catch {
      return false;
    }
  }

  /**
   * Check if sync is needed (24h passed since last sync)
   */
  private async shouldSync(): Promise<boolean> {
    try {
      const lastSyncStr = await storage.getString(LAST_SYNC_KEY);
      if (!lastSyncStr) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'B',location:'src/lib/services/dhikrSyncService.ts:shouldSync',message:'no lastSyncStr',data:{},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        return true; // Never synced
      }

      const lastSync = parseInt(lastSyncStr, 10);
      if (isNaN(lastSync)) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'B',location:'src/lib/services/dhikrSyncService.ts:shouldSync',message:'invalid lastSyncStr',data:{lastSyncStr},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        return true; // Invalid timestamp
      }

      const now = Date.now();
      const timeSinceLastSync = now - lastSync;
      const allowed = timeSinceLastSync >= ONE_DAY_MS;
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'B',location:'src/lib/services/dhikrSyncService.ts:shouldSync',message:'cooldown calc',data:{timeSinceLastSyncMs:timeSinceLastSync,allowed},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return allowed;
    } catch {
      return true; // On error, allow sync
    }
  }

  /**
   * Convert DhikrRecord to sync payload (exclude local-only fields)
   */
  private recordToSyncPayload(record: DhikrRecord): Omit<DhikrRecord, 'user_id' | 'is_dirty' | 'last_synced_at'> {
    return {
      id: record.id,
      slug: record.slug,
      label: record.label,
      target_count: record.target_count,
      current_count: record.current_count,
      status: record.status,
      started_at: record.started_at,
      completed_at: record.completed_at,
      updated_at: record.updated_at,
    };
  }

  /**
   * Sync dirty dhikrs to Supabase
   * 
   * This function:
   * - Checks authentication (only authenticated users)
   * - Checks internet connectivity
   * - Checks 24h cooldown
   * - Fetches dirty records from SQLite
   * - Calls Supabase Edge Function
   * - Marks synced records as clean
   * - Never throws uncaught errors
   */
  async syncDhikrsIfNeeded(): Promise<SyncResult> {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'A',location:'src/lib/services/dhikrSyncService.ts:syncDhikrsIfNeeded',message:'enter',data:{supabaseHost:this.getSupabaseHostForDebug()},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    // Prevent concurrent syncs
    if (this.isSyncing) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'E',location:'src/lib/services/dhikrSyncService.ts:syncDhikrsIfNeeded',message:'exit early: already syncing',data:{},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return {
        success: false,
        syncedCount: 0,
        skippedCount: 0,
        errorCount: 0,
      };
    }

    this.isSyncing = true;
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'E',location:'src/lib/services/dhikrSyncService.ts:syncDhikrsIfNeeded',message:'set isSyncing=true',data:{},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const result: SyncResult = {
      success: false,
      syncedCount: 0,
      skippedCount: 0,
      errorCount: 0,
    };

    try {
      // Check authentication (only sync for authenticated users)
      const authenticated = await this.isAuthenticated();
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'C',location:'src/lib/services/dhikrSyncService.ts:authCheck',message:'isAuthenticated',data:{authenticated},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (!authenticated) {
        // Guest users never sync - this is expected, not an error
        this.isSyncing = false;
        return result;
      }

      // Check internet connectivity
      const online = await this.isOnline();
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'B',location:'src/lib/services/dhikrSyncService.ts:onlineCheck',message:'isOnline',data:{online},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (!online) {
        this.isSyncing = false;
        return result;
      }

      // Get authenticated user ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.id) {
        this.isSyncing = false;
        return result;
      }

      const userId = user.id;
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'C',location:'src/lib/services/dhikrSyncService.ts:userInfo',message:'userInfo',data:{hasUser:!!user,hasUserId:!!user?.id},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      // Get access token for Edge Function Authorization.
      const { data: { session } } = await supabase.auth.getSession();
      let accessToken = session?.access_token;
      // #region agent log
      const claims = accessToken ? this.decodeJwtClaims(accessToken) : {};
      const header = accessToken ? this.decodeJwtHeader(accessToken) : {};
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'D',location:'src/lib/services/dhikrSyncService.ts:tokenInfo',message:'tokenInfo',data:{hasAccessToken:!!accessToken,tokenLength:accessToken?.length ?? 0,segmentCount:accessToken ? accessToken.split('.').length : 0,exp:claims.exp ?? null,iat:claims.iat ?? null,issHost:claims.iss ? (()=>{try{return new URL(claims.iss).host}catch{return null}})() : null,aud:claims.aud ?? null,alg:header.alg ?? null,typ:header.typ ?? null,hasKid:!!header.kid,nowSec:Math.floor(Date.now()/1000)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      // If token seems expired/stale, force refresh (gateway may reject stale JWT even if getUser() succeeds via refresh path).
      if (accessToken && claims.exp && claims.exp <= Math.floor(Date.now() / 1000)) {
        try {
          const refreshed = await supabase.auth.refreshSession();
          const refreshedToken = refreshed.data?.session?.access_token;
          if (refreshedToken) accessToken = refreshedToken;
          const refreshedClaims = refreshedToken ? this.decodeJwtClaims(refreshedToken) : {};
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'D',location:'src/lib/services/dhikrSyncService.ts:tokenRefresh',message:'refreshSession',data:{refreshError:refreshed.error?.message ?? null,tokenChanged:!!refreshedToken && refreshedToken !== session?.access_token,exp:refreshedClaims.exp ?? null,issHost:refreshedClaims.iss ? (()=>{try{return new URL(refreshedClaims.iss).host}catch{return null}})() : null},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
        } catch (e) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'D',location:'src/lib/services/dhikrSyncService.ts:tokenRefresh',message:'refreshSession exception',data:{message:(e as any)?.message ?? null},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
        }
      }

      // Fetch dirty records from SQLite
      const dirtyRecords = await dhikrRepo.getDirtyDhikrs(userId);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'B',location:'src/lib/services/dhikrSyncService.ts:dirtyRecords',message:'dirtyRecordsCount',data:{count:dirtyRecords.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      if (dirtyRecords.length === 0) {
        // No dirty records. IMPORTANT: Don't update LAST_SYNC_KEY here,
        // otherwise new dirty changes would be blocked for 24h.
        this.isSyncing = false;
        result.success = true;
        return result;
      }

      // Check 24h cooldown.
      // If there are dirty records, we still attempt sync even within cooldown.
      const shouldSync = await this.shouldSync();
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'B',location:'src/lib/services/dhikrSyncService.ts:cooldownCheck',message:'shouldSync',data:{shouldSync,dirtyCount:dirtyRecords.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (!shouldSync) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'B',location:'src/lib/services/dhikrSyncService.ts:cooldownSkip',message:'cooldown active but dirty exists -> proceed',data:{dirtyCount:dirtyRecords.length},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      }

      // Convert to sync payload (exclude local-only fields)
      const syncPayload = dirtyRecords.map(record => this.recordToSyncPayload(record));

      // Call Supabase Edge Function
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'A',location:'src/lib/services/dhikrSyncService.ts:invoke',message:'invoke sync_dhikr',data:{payloadCount:syncPayload.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const fetchResult = accessToken
        ? await this.invokeDhikrSyncViaFetch(accessToken, syncPayload)
        : { ok: false, status: 0, bodyText: 'Missing access token' };

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'D',location:'src/lib/services/dhikrSyncService.ts:invokeFetch',message:'invoke via fetch result',data:{status:fetchResult.status,ok:fetchResult.ok,bodySnippet:(fetchResult.bodyText||'').slice(0,200)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      if (!fetchResult.ok) {
        console.error('[DhikrSync] Edge function status:', fetchResult.status);
        if (fetchResult.bodyText) console.error('[DhikrSync] Edge function body:', fetchResult.bodyText);
        this.isSyncing = false;
        return result;
      }

      let data: unknown;
      try {
        data = fetchResult.bodyText ? JSON.parse(fetchResult.bodyText) : {};
      } catch {
        data = {};
      }

      // Process response (Edge Function returns { syncedIds, errors }; skippedIds yok)
      const response = data as {
        syncedIds?: string[];
        skippedIds?: string[];
        errors?: Array<{ id: string; error: string }>;
      };
      const syncedIds = response.syncedIds ?? [];
      const skippedIds = response.skippedIds ?? [];
      const errors = response.errors ?? [];

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'B',location:'src/lib/services/dhikrSyncService.ts:invokeSuccess',message:'invoke success summary',data:{synced:syncedIds.length,skipped:skippedIds.length,errors:errors.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      // Mark successfully synced records as clean
      for (const id of syncedIds) {
        try {
          await dhikrRepo.markDhikrSynced(id);
          result.syncedCount++;
        } catch (err) {
          console.error(`[DhikrSync] Error marking ${id} as synced:`, err);
          result.errorCount++;
        }
      }

      // Log skipped records (conflict resolution - server has newer version)
      result.skippedCount = skippedIds.length;
      if (result.skippedCount > 0) {
        console.log(`[DhikrSync] Skipped ${result.skippedCount} records (server has newer version)`);
      }

      // Log errors
      result.errorCount += errors.length;
      if (errors.length > 0) {
        console.error('[DhikrSync] Sync errors:', errors);
      }

      // Update last sync timestamp
      await storage.set(LAST_SYNC_KEY, Date.now().toString());

      result.success = result.errorCount === 0;
    } catch (error) {
      // Fail silently - don't throw, just log
      console.error('[DhikrSync] Sync exception:', error);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'E',location:'src/lib/services/dhikrSyncService.ts:syncDhikrsIfNeeded',message:'caught exception',data:{name:(error as any)?.name ?? null,message:(error as any)?.message ?? null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      result.success = false;
    } finally {
      this.isSyncing = false;
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'E',location:'src/lib/services/dhikrSyncService.ts:syncDhikrsIfNeeded',message:'finally set isSyncing=false',data:{},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    }

    return result;
  }

  /**
   * Get sync status (for debugging/monitoring)
   */
  async getSyncStatus(): Promise<{
    isSyncing: boolean;
    lastSyncTimestamp: number | null;
    canSync: boolean;
  }> {
    const lastSyncStr = await storage.getString(LAST_SYNC_KEY);
    const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : null;
    const authenticated = await this.isAuthenticated();
    const online = await this.isOnline();
    const shouldSync = await this.shouldSync();

    return {
      isSyncing: this.isSyncing,
      lastSyncTimestamp: lastSync,
      canSync: authenticated && online && shouldSync && !this.isSyncing,
    };
  }
}

// Singleton instance
export const dhikrSyncService = new DhikrSyncService();
