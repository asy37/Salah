/**
 * Supabase client configuration
 * APK'da env yok; değerler app.config.js → extra ile build zamanında gömülür (Constants).
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Database } from './types';

const extra = Constants.expoConfig?.extra as { supabaseUrl?: string; supabaseAnonKey?: string } | undefined;
const supabaseUrl = extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

console.log('[Supabase Client] Initializing...', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlLength: supabaseUrl.length,
  keyLength: supabaseAnonKey.length,
  urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'N/A',
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Supabase URL and Anon Key are required!',
    '\nPlease set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.',
    '\nCurrent values:',
    `\n  URL: ${supabaseUrl ? `✅ Set (${supabaseUrl.length} chars)` : '❌ Missing'}`,
    `\n  Key: ${supabaseAnonKey ? `✅ Set (${supabaseAnonKey.length} chars)` : '❌ Missing'}`
  );
} else {
  // Validate URL format
  if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    console.error(
      '❌ Invalid Supabase URL format!',
      '\nURL must start with http:// or https://',
      `\nCurrent URL: ${supabaseUrl.substring(0, 50)}...`
    );
  }
  
  // Validate URL length (Supabase URLs are typically 40-60 characters)
  if (supabaseUrl.length < 20) {
    console.warn(
      '⚠️ Supabase URL seems too short!',
      `\nExpected length: 40-60 characters`,
      `\nCurrent length: ${supabaseUrl.length}`,
      `\nURL: ${supabaseUrl}`
    );
  }
}

// Custom AsyncStorage adapter for Supabase auth
const AsyncStorageAdapter = {
  getItem: async (key: string) => {
    return await AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    await AsyncStorage.removeItem(key);
  },
};

// Use Supabase's default fetch implementation
// React Native's fetch should work out of the box with Supabase
// Custom fetch was causing issues in iOS Simulator
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  // Don't override fetch - let Supabase use React Native's native fetch
  // This should work better in iOS Simulator
});

