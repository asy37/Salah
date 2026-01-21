/**
 * User Management Hook
 * Handles both authenticated and guest users
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { storage } from '@/lib/storage/mmkv';

const GUEST_USER_ID_KEY = 'guest_user_id';

/**
 * Generate or retrieve guest user ID
 * Format: guest-{randomId}
 */
async function getOrCreateGuestUserId(): Promise<string> {
  // Try to get existing guest ID
  let guestId = await storage.getString(GUEST_USER_ID_KEY);
  
  if (!guestId) {
    // Generate new guest ID
    const randomId = Math.random().toString(36).substring(2, 15) + 
                    Math.random().toString(36).substring(2, 15);
    guestId = `guest-${randomId}`;
    await storage.set(GUEST_USER_ID_KEY, guestId);
  }
  
  return guestId;
}

/**
 * Get current user ID (authenticated or guest)
 */
export function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initUser() {
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Authenticated user
          setUserId(session.user.id);
          setIsGuest(false);
        } else {
          // Guest user
          const guestId = await getOrCreateGuestUserId();
          setUserId(guestId);
          setIsGuest(true);
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        // Fallback to guest
        const guestId = await getOrCreateGuestUserId();
        setUserId(guestId);
        setIsGuest(true);
      } finally {
        setIsLoading(false);
      }
    }

    initUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUserId(session.user.id);
          setIsGuest(false);
        } else {
          const guestId = await getOrCreateGuestUserId();
          setUserId(guestId);
          setIsGuest(true);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { userId, isGuest, isLoading };
}

