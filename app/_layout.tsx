import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import "../global.css";
// Note: NotificationService is lazy-loaded to avoid Expo Go compatibility issues
// It will be imported only when needed, not at app startup
import PrayerHeader from "@/components/layout/header";
import { queryClient } from "@/lib/query/queryClient";
import { setupQueryManagers } from "@/lib/query/setup";
import { useAuthFlow } from "@/lib/hooks/auth/useAuth";
import EmailConfirmationProvider from "@/components/auth/email/EmailConfirmationProvider";
import LocationPermissionProvider from "@/components/location/LocationPermissionProvider";
import { queryKeys } from "@/lib/query/queryKeys";
import { fetchPrayerTimes } from "@/lib/api/services/prayerTimes";
import { useLocationStore } from "@/lib/storage/locationStore";
import { useMethodStore } from "@/lib/storage/useMethodStore";
import { useDhikrSync } from "@/lib/hooks/dhikir/useDhikrSync";
import { useDuaSync } from "@/lib/hooks/duas/useDuaSync";
import { useTranslationStore } from "@/lib/storage/useQuranStore";
import { getDownloadedTranslations } from "@/lib/database/sqlite/translation/repository";
import { QuranAudioProvider } from "@/contexts/QuranAudioContext";
import { useTranslationByIdentifier } from "@/lib/hooks/quran/useTranslationByIdentifier";
import { notificationService, NOTIFICATION_ACTIONS } from "@/lib/notifications/NotificationService";
import { notificationScheduler } from "@/lib/services/notificationScheduler";
import { useNotificationSettings } from "@/lib/storage/notificationSettings";
import { syncPushTokenAndSettings } from "@/lib/services/pushTokenSync";
import { useThemeStore } from "@/lib/storage/useThemeStore";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { shouldShowRegister, canAccessApp, isLoading } = useAuthFlow();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Fonts are optional - app will work without them
  const [fontsLoaded] = useFonts({
    // Comment out if font files are not available yet
    // 'Amiri-Regular': require('../assets/fonts/Amiri-Regular.ttf'),
    // 'Amiri-Bold': require('../assets/fonts/Amiri-Bold.ttf'),
    // 'ScheherazadeNew-Regular': require('../assets/fonts/ScheherazadeNew-Regular.ttf'),
    // 'ScheherazadeNew-Bold': require('../assets/fonts/ScheherazadeNew-Bold.ttf'),
  });

  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
  }, []);

  // Apply saved theme on mount (persisted preference)
  useEffect(() => {
    useThemeStore.getState().applyTheme();
  }, []);

  // Setup TanStack Query managers (focus & online)
  useEffect(() => {
    setupQueryManagers();
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (isLoading || !isNavigationReady) return;

    const inAuthGroup = segments[0] === "auth";
    const inTabsGroup = segments[0] === "(tabs)";

    if (shouldShowRegister && !inAuthGroup) {
      // No session, redirect to register
      router.replace("/auth/register");
    } else if (canAccessApp && !inTabsGroup && !inAuthGroup) {
      // Session exists - user can access app (email confirmation not required)
      router.replace("/(tabs)");
    }
  }, [
    isLoading,
    shouldShowRegister,
    canAccessApp,
    segments,
    isNavigationReady,
    router,
  ]);

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    SplashScreen.hideAsync()
      .then(() => {
        setIsNavigationReady(true);
      })
      .catch((error) => {
        setIsNavigationReady(true);
      });
  }, [fontsLoaded]);

  // Prefetch prayer times on app start and when location changes
  const location = useLocationStore((state) => state.location);
  const method = useMethodStore((state) => state.method?.id);
  const notificationSettings = useNotificationSettings();

  // Notification response handler
  const notificationListener = useRef<{ remove: () => void } | null>(null);
  const responseListener = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    notificationService.requestPermissions();
    syncPushTokenAndSettings();

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      // Handle foreground notifications if needed
      console.log('[Notification] Received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const actionIdentifier = response.actionIdentifier;
        const data = response.notification.request.content.data;

        // Handle action button clicks
        if (actionIdentifier === NOTIFICATION_ACTIONS.PRAYER_MARKED_PRAYED) {
          const { prayerTrackingRepo } = await import('@/lib/database/sqlite/prayer-tracking/repository');
          const { getTodayDateString } = await import('@/lib/services/dailyReset');
          
          if (data?.prayerName && typeof data.prayerName === 'string') {
            const prayerName = data.prayerName.toLowerCase();
            const today = getTodayDateString();
            await prayerTrackingRepo.upsertPrayerState(today, prayerName as any, 'prayed');
            
            // Cancel related reminder notifications
            await notificationService.cancelNotificationsByType('prayer_reminder');
            
            // Invalidate prayer tracking query
            queryClient.invalidateQueries({
              queryKey: ['prayerTracking', 'local', today],
            });
          }
          return;
        }

        if (actionIdentifier === NOTIFICATION_ACTIONS.PRAYER_REMIND_LATER) {
          // Schedule reminder for next prayer
          if (data?.prayerName && typeof data.prayerName === 'string') {
            // Get prayer times to find next prayer
            const latitude = location?.latitude ?? 41.0082;
            const longitude = location?.longitude ?? 28.9784;
            
            try {
              const prayerTimesResponse = await fetchPrayerTimes({
                latitude,
                longitude,
                method: method ?? 13,
              });
              
              await notificationScheduler.scheduleReminderForNextPrayer(
                data.prayerName,
                prayerTimesResponse
              );
            } catch (error) {
              console.error('[Notification] Failed to schedule reminder:', error);
            }
          }
          return;
        }

        // Handle notification tap (not action button)
        if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          const deepLink = typeof data?.deepLink === 'string' ? data.deepLink : '';
          if (deepLink) {
            if (deepLink.includes('daily-verse')) {
              router.push('/(tabs)/more/daily-verse');
            } else if (deepLink.includes('adhan')) {
              router.push('/(tabs)/adhan');
            } else if (deepLink.includes('tracking')) {
              router.push('/(tabs)');
            }
          } else if (data?.type === 'prayer_time') {
            router.push('/(tabs)/adhan');
          } else if (data?.type === 'streak') {
            router.push('/(tabs)');
          } else if (data?.type === 'daily_verse') {
            router.push('/(tabs)/more/daily-verse');
          } else if (data?.type === 'pre_prayer' || data?.type === 'prayer_reminder') {
            router.push('/(tabs)');
          }
        }

        // Call service handler
        await notificationService.handleNotificationResponse(response as any);
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    // Method is always available (has default value), but we need to wait for it
    if (!method) return;

    // Use location if available, otherwise use default Istanbul coordinates
    const latitude = location?.latitude ?? 41.0082;
    const longitude = location?.longitude ?? 28.9784;

    const prefetchAndSchedule = async () => {
      try {
        const prayerTimesResponse = await fetchPrayerTimes({
          latitude,
          longitude,
          method,
        });

        // Prefetch for query cache
        queryClient.prefetchQuery({
          queryKey: queryKeys.prayerTimes.byLocation(latitude, longitude, method.toString()),
          queryFn: () => prayerTimesResponse,
          staleTime: 24 * 60 * 60 * 1000, // 24 saat
        });

        // Schedule notifications
        await notificationScheduler.scheduleAllNotifications(prayerTimesResponse, 7);
      } catch (error) {
        console.error('[Layout] Failed to schedule notifications:', error);
      }
    };

    prefetchAndSchedule();
  }, [location, method, notificationSettings]);

  const { selectedTranslation, setSelectedTranslation, setTranslationData } =
    useTranslationStore();
  const [downloadedList, setDownloadedList] = useState<
    Awaited<ReturnType<typeof getDownloadedTranslations>> | null
  >(null);

  // İndirilmiş çevirileri yükle (seçili yoksa data[0] ile varsayılan atamak için)
  useEffect(() => {
    getDownloadedTranslations().then(setDownloadedList);
  }, []);

  // Öncelik: 1) Daha önce seçilmiş, 2) Seçili yok ve data varsa data[0]
  const effectiveIdentifier =
    selectedTranslation?.edition_identifier ??
    downloadedList?.[0]?.edition_identifier ??
    null;

  const { translation: quran } = useTranslationByIdentifier(effectiveIdentifier);

  // Seçili yoksa ama indirilmiş liste varsa ilkini seçili yap (persist için)
  useEffect(() => {
    if (!selectedTranslation && downloadedList && downloadedList.length > 0) {
      setSelectedTranslation(downloadedList[0]);
    }
  }, [selectedTranslation, downloadedList, setSelectedTranslation]);

  useEffect(() => {
    if (quran) {
      setTranslationData(quran);
    }
  }, [quran, setTranslationData]);


  // Show loading screen while checking auth
  // if (isLoading || !isNavigationReady) {
  //   return (
  //     <View className="flex-1 items-center justify-center bg-background-light dark:bg-background-dark">
  //       <ActivityIndicator size="large" color="#1F8F5F" />
  //     </View>
  //   );
  // }
  return (
    <QueryClientProvider client={queryClient}>
      <QuranAudioProvider>
        <EmailConfirmationProvider />
        <LocationPermissionProvider />
        <DhikrSyncProvider />
        <DuaSyncProvider />
        {!shouldShowRegister && <PrayerHeader />}

        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
        </Stack>
      </QuranAudioProvider>
    </QueryClientProvider>
  );
}

/**
 * Provider component for dhikr sync
 * Sets up automatic sync triggers
 */
function DhikrSyncProvider() {
  useDhikrSync();
  return null;
}

/**
 * Provider component for dua sync
 * Sets up automatic sync triggers
 */
function DuaSyncProvider() {
  useDuaSync();
  return null;
}
