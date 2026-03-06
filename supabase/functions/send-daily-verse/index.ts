/**
 * Edge Function: Send Daily Verse
 * 
 * Sends daily verse notification to all users who have it enabled.
 * Should be scheduled to run daily (e.g., via cron job or Supabase Cron).
 */

// Deno types - IDE support
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

// @ts-expect-error - Deno runtime supports HTTP imports
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DailyVerse {
  surah: number;
  ayah: number;
  text: string;
  translation: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with daily verse enabled
    const { data: users, error: usersError } = await supabase
      .from('user_settings')
      .select('user_id, daily_verse_time')
      .eq('daily_verse_enabled', true);

    if (usersError) {
      throw usersError;
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users with daily verse enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get random verse (for now, we'll use a simple random selection)
    // TODO: Implement proper verse selection logic
    const randomVerse: DailyVerse = {
      surah: 2,
      ayah: 255,
      text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
      translation: 'Allah - O\'ndan başka ilah yoktur. O, Hayy ve Kayyum\'dur.',
    };

    // Get push tokens for all users
    const userIds = users.map((u) => u.user_id);
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token, platform, user_id')
      .in('user_id', userIds);

    if (tokensError) {
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push tokens found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Send push notifications via Expo Push API
    const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
    const messages = tokens.map((token) => ({
      to: token.token,
      sound: 'default',
      title: 'Günlük Ayet',
      body: `${randomVerse.translation} - ${randomVerse.surah}:${randomVerse.ayah}`,
      data: {
        type: 'daily_verse',
        surah: randomVerse.surah,
        ayah: randomVerse.ayah,
        deepLink: 'salah://more/daily-verse',
      },
      priority: 'default',
    }));

    const response = await fetch(expoPushUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    return new Response(
      JSON.stringify({
        message: 'Daily verse notifications sent',
        sent: result.data?.length || 0,
        verse: randomVerse,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

