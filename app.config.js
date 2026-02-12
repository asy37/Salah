/**
 * Dinamik Expo config: .env / EAS env değişkenleri extra'ya yazılır,
 * böylece APK içinde Constants.expoConfig.extra üzerinden okunur.
 * EAS Build'de EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY
 * EAS ortam değişkenleri olarak tanımlanmalı.
 */
const base = require('./app.json');

module.exports = () => ({
  ...base,
  extra: {
    ...base.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  },
});
