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
import { storage } from "@/lib/storage/mmkv";

const ONBOARDING_COMPLETED_KEY = "onboarding_completed";

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
    // Production APK ilk açılışta requestIdleCallback bazen gecikiyor; doğrudan setTimeout kullan.
    const timeoutId = setTimeout(run, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    setupQueryManagers();
  }, []);

  // Yönlendirme: nav ready olduktan sonra segment/auth değişince (örn. logout sonrası).
  useEffect(() => {
    if (isLoading || !isNavigationReady) return;
    let cancelled = false;
    storage.getString(ONBOARDING_COMPLETED_KEY).then((value) => {
      if (cancelled) return;
      const inOnboarding = segments[0] === "onboarding";
      if (value !== "true") {
        if (!inOnboarding) router.replace("/onboarding");
        return;
      }
      const inAuth = segments[0] === "auth";
      const inTabs = segments[0] === "(tabs)";
      if (inOnboarding) return;
      if (shouldShowRegister && !inAuth) {
        router.replace("/auth/register");
      } else if (canAccessApp && !inTabs && !inAuth) {
        router.replace("/(tabs)");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isLoading, shouldShowRegister, canAccessApp, segments, isNavigationReady, router]);

  // appReady olunca önce doğru sayfaya yönlendir, sonra splash kapat ve nav ready yap (yanlış sayfa flash olmasın).
  useEffect(() => {
    if (!appReady) return;
    let cancelled = false;
    let done = false;
    let delayId: ReturnType<typeof setTimeout>;
    let fallbackId: ReturnType<typeof setTimeout>;
    const setNavReady = () => {
      if (done || cancelled) return;
      done = true;
      setIsNavigationReady(true);
    };

    storage.getString(ONBOARDING_COMPLETED_KEY).then((value) => {
      if (cancelled) return;
      if (value !== "true") {
        router.replace("/onboarding");
      } else if (shouldShowRegister) {
        router.replace("/auth/register");
      } else if (canAccessApp) {
        router.replace("/(tabs)");
      }
      // Yönlendirme tetiklendikten sonra kısa gecikmeyle splash kapat; router'ın ekranı değiştirmesi için zaman tanı.
      delayId = setTimeout(() => {
        if (cancelled) return;
        SplashScreen.hideAsync()
          .then(setNavReady)
          .catch(setNavReady);
        fallbackId = setTimeout(setNavReady, 800);
      }, 50);
    });

    return () => {
      cancelled = true;
      clearTimeout(delayId);
      clearTimeout(fallbackId);
    };
  }, [appReady, shouldShowRegister, canAccessApp, router]);

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
          {segments[0] !== "onboarding" && segments[0] !== "auth" && <PrayerHeader />}
          <StalePrayerTimesModal
            visible={showStaleModal}
            onClose={closeStaleModal}
          />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="onboarding" />
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
