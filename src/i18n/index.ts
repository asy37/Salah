/**
 * i18n setup: init, RTL for Arabic, persistence via localeStorage.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';
import { getStoredLanguage } from './localeStorage';
import type { SupportedLocale } from './localeStorage';

import en from './locales/en.json';
import tr from './locales/tr.json';
import ar from './locales/ar.json';

const resources = {
  en: { translation: en },
  tr: { translation: tr },
  ar: { translation: ar },
};

const supportedLangs: SupportedLocale[] = ['en', 'tr', 'ar'];

function normalizeLocale(code: string): SupportedLocale {
  const base = code.split(/[-_]/)[0]?.toLowerCase() ?? '';
  if (base === 'en' || base === 'tr' || base === 'ar') return base;
  return 'tr';
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'tr',
  fallbackLng: 'tr',
  supportedLngs: supportedLangs,
  interpolation: { escapeValue: false },
});

/**
 * Initialize i18n: prefer stored language, else device locale (if en/tr/ar), else 'tr'.
 * Applies RTL when language is Arabic.
 */
export async function initI18n(overrideLocale?: SupportedLocale): Promise<SupportedLocale> {
  let locale: SupportedLocale;
  if (overrideLocale) {
    locale = overrideLocale;
  } else {
    const stored = await getStoredLanguage();
    if (stored) {
      locale = stored;
    } else {
      const deviceLocales = Localization.getLocales();
      const deviceCode = deviceLocales[0]?.languageCode;
      locale = deviceCode ? normalizeLocale(deviceCode) : 'tr';
    }
  }
  await i18n.changeLanguage(locale);
  const isRTL = locale === 'ar';
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.forceRTL(isRTL);
    // RTL change often requires app reload; caller may use Updates.reloadAsync() after init
  }
  return locale;
}

export { i18n };
export { useTranslation } from 'react-i18next';
