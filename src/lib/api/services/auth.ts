/**
 * Authentication Service
 * Handles user registration, anonymous sign-in, and session management
 */

import { supabase } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export interface SignUpData {
  email: string;
  password: string;
  name?: string;
  surname?: string;
  image?: string;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: Error | null;
}

/**
 * Sign in with email and password
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        user: null,
        session: null,
        error: new Error(error.message),
      };
    }

    return {
      user: authData.user,
      session: authData.session,
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error: error instanceof Error ? error : new Error('Giriş yapılırken bir hata oluştu'),
    };
  }
}

/**
 * Sign up with email and password
 * Email confirmation is required
 */
export async function signUp(data: SignUpData): Promise<AuthResponse> {
  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name || null,
          surname: data.surname || null,
          image: data.image || null,
        },
        emailRedirectTo: undefined, // We'll handle confirmation in-app
      },
    });

    if (error) {
      return {
        user: null,
        session: null,
        error: new Error(error.message),
      };
    }

    return {
      user: authData.user,
      session: authData.session,
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error: error instanceof Error ? error : new Error('Kayıt olurken bir hata oluştu'),
    };
  }
}

/**
 * Sign in anonymously (Guest Mode)
 * Uses Supabase's native signInAnonymously() method
 * Creates a temporary anonymous user session without requiring email/password
 */
export async function signInAnonymously(): Promise<AuthResponse> {
  try {
    // Check if there's already an anonymous session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const user = session.user;
      if (isAnonymousUser(user)) {
        // Already have an anonymous session
        return {
          user,
          session,
          error: null,
        };
      }
    }

    // Use Supabase's native signInAnonymously method
    const { data: authData, error } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          is_anonymous: true,
          guest_id: `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        },
      },
    });

    if (error) {
      return {
        user: null,
        session: null,
        error: new Error(error.message),
      };
    }

    return {
      user: authData.user,
      session: authData.session,
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error: error instanceof Error ? error : new Error('Misafir girişi yapılırken bir hata oluştu'),
    };
  }
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[getSession] Error:', error);
      return null;
    }
    return data.session;
  } catch (error) {
    console.error('[getSession] Exception:', error);
    return null;
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('[getCurrentUser] Error:', error);
      return null;
    }
    return user;
  } catch (error) {
    console.error('[getCurrentUser] Exception:', error);
    return null;
  }
}

/**
 * Check if user is anonymous
 * Supabase anonymous users:
 * - Don't have an email (email is null/undefined)
 * - Have is_anonymous flag in JWT (accessible via user.app_metadata or user_metadata)
 * - Can be identified by checking if email is missing
 */
export function isAnonymousUser(user: User | null): boolean {
  if (!user) return false;
  
  // Supabase native anonymous users don't have an email
  const hasNoEmail = !user.email || user.email === '';
  
  // Check user metadata for is_anonymous flag
  const isAnonymousInMetadata = user.user_metadata?.is_anonymous === true;
  
  // Check app_metadata (Supabase stores is_anonymous in app_metadata for native anonymous users)
  const isAnonymousInAppMetadata = (user.app_metadata as any)?.is_anonymous === true;
  
  // Legacy check for guest email format (for backward compatibility)
  const isGuestEmail = user.email?.endsWith('@guest.local') || false;
  
  return hasNoEmail || isAnonymousInMetadata || isAnonymousInAppMetadata || isGuestEmail;
}

/**
 * Check if user email is confirmed
 */
export function isEmailConfirmed(user: User | null): boolean {
  if (!user) return false;
  
  // Anonymous users don't need email confirmation
  if (isAnonymousUser(user)) return true;
  
  // Check email confirmation status
  return user.email_confirmed_at !== null;
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    console.log("SIGNING OUT");
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: new Error(error.message) };
    }
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Çıkış yapılırken bir hata oluştu'),
    };
  }
}

/**
 * Resend confirmation email
 */
export async function resendConfirmationEmail(email: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Onay maili gönderilirken bir hata oluştu'),
    };
  }
}

/**
 * Send password reset email
 */
export async function resetPasswordForEmail(email: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: undefined, // Uygulama içi yönlendirme gerekirse ayarlanabilir
    });

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Şifre sıfırlama maili gönderilirken bir hata oluştu'),
    };
  }
}

