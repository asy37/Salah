/**
 * Edge Function: Sync Dhikr
 * 
 * Accepts array of dhikr records from client and upserts them safely.
 * Resolves conflicts using updated_at (last-write-wins).
 * 
 * Rules:
 * - If record exists and incoming.updated_at < db.updated_at → ignore
 * - Else → update
 */

// Deno types are available at runtime in Supabase Edge Functions
// These declarations are for TypeScript IDE support only
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

// HTTP imports work in Deno runtime but TypeScript IDE doesn't recognize them
// @ts-expect-error - Deno runtime supports HTTP imports from esm.sh
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DhikrRecord {
  id: string;
  slug: string;
  label: string;
  target_count: number;
  current_count: number;
  status: 'active' | 'completed';
  started_at: number; // milliseconds
  completed_at: number | null; // milliseconds | null
  updated_at: number; // milliseconds
}

interface SyncRequest {
  dhikrs: DhikrRecord[];
}

interface SyncResponse {
  syncedIds: string[];
  errors: Array<{ id: string; error: string }>;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with ANON_KEY (respects RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    // Get Authorization header for client creation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create client with Authorization header (RLS will be enforced)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify user is authenticated (client handles token automatically)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Parse request body
    const body: SyncRequest = await req.json();
    if (!body.dhikrs || !Array.isArray(body.dhikrs)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: dhikrs array required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const response: SyncResponse = {
      syncedIds: [],
      errors: [],
    };

    // Process each dhikr record
    for (const dhikr of body.dhikrs) {
      try {
        // Atomic upsert with conflict resolution (last-write-wins)
        // Database function handles WHERE clause atomically
        const { error: upsertError } = await supabase.rpc('upsert_dhikr_with_conflict_resolution', {
          p_id: dhikr.id,
          p_user_id: user.id,
          p_slug: dhikr.slug,
          p_label: dhikr.label,
          p_target_count: dhikr.target_count,
          p_current_count: dhikr.current_count,
          p_status: dhikr.status,
          p_started_at: dhikr.started_at,
          p_completed_at: dhikr.completed_at,
          p_updated_at: dhikr.updated_at,
        });

        if (upsertError) {
          response.errors.push({ id: dhikr.id, error: upsertError.message });
        } else {
          // RPC succeeded - record was either inserted or updated (if newer)
          // If existing record was newer, WHERE clause prevented update (no error, but no change)
          // This is acceptable for offline-first: SQLite is source of truth
          response.syncedIds.push(dhikr.id);
        }
      } catch (error) {
        response.errors.push({
          id: dhikr.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
