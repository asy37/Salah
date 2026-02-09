/**
 * Edge Function: Send Prayer Streak
 *
 * Sends streak notification to users with streak_enabled and streak >= 3.
 * Should be scheduled daily (e.g., via Supabase Cron or external cron).
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

const MIN_STREAK_FOR_NOTIFICATION = 3;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: users, error: usersError } = await supabase
      .from('user_settings')
      .select('user_id, streak_time')
      .eq('streak_enabled', true);

    if (usersError) {
      throw usersError;
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users with streak notifications enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const tokensByUser = new Map<string, { token: string; platform: string }[]>();
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

    for (const t of tokens) {
      const list = tokensByUser.get(t.user_id) ?? [];
      list.push({ token: t.token, platform: t.platform });
      tokensByUser.set(t.user_id, list);
    }

    const messages: Array<{ to: string; sound: string; title: string; body: string; data: Record<string, unknown> }> = [];

    for (const user of users) {
      const { data: streak, error: streakError } = await supabase.rpc('get_prayer_streak_for_user', {
        p_user_id: user.user_id,
      });

      if (streakError || streak == null || streak < MIN_STREAK_FOR_NOTIFICATION) {
        continue;
      }

      const userTokens = tokensByUser.get(user.user_id);
      if (!userTokens || userTokens.length === 0) {
        continue;
      }

      const title = 'Maşallah!';
      const body = `${streak} gündür namazlarını aksatmıyorsun. Böyle devam et!`;

      for (const { token } of userTokens) {
        messages.push({
          to: token,
          sound: 'default',
          title,
          body,
          data: {
            type: 'streak',
            count: streak,
            deepLink: 'islamicapp://tracking',
          },
        });
      }
    }

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No streak notifications to send' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
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
        message: 'Streak notifications sent',
        sent: result.data?.length ?? 0,
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
