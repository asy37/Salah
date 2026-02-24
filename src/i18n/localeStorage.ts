/**
 * Persist user's language choice (AsyncStorage key: app_lang)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_LANG_KEY = 'app_lang';

export type SupportedLocale = 'en' | 'tr' | 'ar';

export async function getStoredLanguage(): Promise<SupportedLocale | null> {
  try {
    const value = await AsyncStorage.getItem(APP_LANG_KEY);
    if (value === 'en' || value === 'tr' || value === 'ar') return value;
    return null;
  } catch {
    return null;
  }
}

export async function setStoredLanguage(locale: SupportedLocale): Promise<void> {
  try {
    await AsyncStorage.setItem(APP_LANG_KEY, locale);
  } catch (error) {
    console.error('[i18n] Failed to persist language:', error);
  }
}
