/**
 * Authentication Hook
 * Manages authentication state and session
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { isAnonymousUser, isEmailConfirmed } from '@/lib/api/services/auth';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAnonymous: boolean;
  isEmailConfirmed: boolean;
}

/**
 * Hook: Get current authentication state
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      // For SIGNED_IN and SIGNED_UP events, ensure we have the latest session
      if (event === 'SIGNED_IN' || event === 'SIGNED_UP' || event === 'TOKEN_REFRESHED') {
        // Double-check session to ensure it's up to date
        const { data: { session: latestSession } } = await supabase.auth.getSession();
        setSession(latestSession);
        setUser(latestSession?.user ?? null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAnonymous = isAnonymousUser(user);
  const isEmailConfirmedValue = isEmailConfirmed(user);

  return {
    user,
    session,
    isLoading,
    isAnonymous,
    isEmailConfirmed: isEmailConfirmedValue,
  };
}

/**
 * Hook: Check if user should see registration screen
 * Email confirmation is no longer required - users can access app immediately after registration
 */
export function useAuthFlow() {
  const { user, session, isLoading, isAnonymous, isEmailConfirmed } = useAuth();

  // Determine what screen to show
  const shouldShowRegister = !isLoading && !user && !session;
  // Email confirmation is optional - users can access app without confirming email
  // Allow access if user exists (even if session is null due to email confirmation)
  const canAccessApp = !isLoading && (!!session || !!user);

  return {
    shouldShowRegister,
    shouldShowConfirmation: false, // Deprecated - no longer blocking
    canAccessApp,
    isLoading,
    user,
    session,
    isAnonymous,
    isEmailConfirmed,
  };
}

