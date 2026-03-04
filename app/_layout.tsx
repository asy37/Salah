import "@/lib/utils/debugLogInit";
import "../global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { QueryClientProvider } from "@tanstack/react-query";
import { initI18n } from "@/i18n";
import PrayerHeader from "@/components/layout/header";
import { queryClient } from "@/lib/query/queryClient";
import { setupQueryManagers } from "@/lib/query/setup";
import { useAuthFlow } from "@/lib/hooks/auth/useAuth";
import EmailConfirmationProvider from "@/components/auth/email/EmailConfirmationProvider";
import LocationPermissionProvider from "@/components/location/LocationPermissionProvider";
import { useThemeStore } from "@/lib/storage/useThemeStore";
import { getDb } from "@/lib/database/sqlite/db";
import { usePrayerTimesRefreshOnReconnect } from "@/lib/hooks/adhan/usePrayerTimesRefreshOnReconnect";
import { useDhikrSync } from "@/lib/hooks/dhikir/useDhikrSync";
import { useDuaSync } from "@/lib/hooks/duas/useDuaSync";
import { useProfileSync } from "@/lib/hooks/profile/useProfileSync";
import { useNotificationSetup } from "@/lib/hooks/layout/useNotificationSetup";
import { usePrayerTimesPrefetch } from "@/lib/hooks/layout/usePrayerTimesPrefetch";
import { useStalePrayerTimesModal } from "@/lib/hooks/layout/useStalePrayerTimesModal";
import { useTranslationInit } from "@/lib/hooks/layout/useTranslationInit";
import { DebugErrorBoundary } from "@/components/DebugErrorBoundary";
import StalePrayerTimesModal from "@/components/adhan/StalePrayerTimesModal";
import { QuranAudioProvider } from "@/contexts/QuranAudioContext";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { shouldShowRegister, canAccessApp, isLoading } = useAuthFlow();
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [i18nReady, setI18nReady] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true)).catch(() => setI18nReady(true));
  }, []);

  const [fontsLoaded] = useFonts({});

  const appReady =
    !isLoading && i18nReady && dbReady && fontsLoaded;

  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
  }, []);

  useEffect(() => {
    useThemeStore.getState().applyTheme();
  }, []);

  useEffect(() => {
    const run = () => {
      getDb().then(() => setDbReady(true)).catch(() => setDbReady(false));
    };
    const useIdle =
      typeof requestIdleCallback === "function" &&
      typeof cancelIdleCallback === "function";
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (useIdle) {
      idleId = requestIdleCallback(run, { timeout: 100 });
    } else {
      timeoutId = setTimeout(run, 0);
    }
    return () => {
      if (idleId !== undefined) cancelIdleCallback(idleId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    setupQueryManagers();
  }, []);

  useEffect(() => {
    if (isLoading || !isNavigationReady) return;
    const inAuth = segments[0] === "auth";
    const inTabs = segments[0] === "(tabs)";
    if (shouldShowRegister && !inAuth) {
      router.replace("/auth/register");
    } else if (canAccessApp && !inTabs && !inAuth) {
      router.replace("/(tabs)");
    }
  }, [isLoading, shouldShowRegister, canAccessApp, segments, isNavigationReady, router]);

  useEffect(() => {
    if (!appReady) return;
    SplashScreen.hideAsync()
      .then(() => setIsNavigationReady(true))
      .catch(() => setIsNavigationReady(true));
  }, [appReady]);

  useNotificationSetup(router);
  usePrayerTimesPrefetch(dbReady);
  useTranslationInit(dbReady);

  const [showStaleModal, closeStaleModal] = useStalePrayerTimesModal(
    canAccessApp,
    segments,
    isNavigationReady
  );

  return (
    <DebugErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <QuranAudioProvider>
          <EmailConfirmationProvider />
          <LocationPermissionProvider />
          <DhikrSyncProvider />
          <DuaSyncProvider />
          {!shouldShowRegister && <PrayerHeader />}
          <StalePrayerTimesModal
            visible={showStaleModal}
            onClose={closeStaleModal}
          />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" />
          </Stack>
        </QuranAudioProvider>
      </QueryClientProvider>
    </DebugErrorBoundary>
  );
}

function DhikrSyncProvider() {
  useDhikrSync();
  usePrayerTimesRefreshOnReconnect();
  return null;
}

function DuaSyncProvider() {
  useDuaSync();
  useProfileSync();
  return null;
}
