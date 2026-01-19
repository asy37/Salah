import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { QueryClientProvider } from "@tanstack/react-query";
import { View, ActivityIndicator } from "react-native";
import "../global.css";
// Note: NotificationService is lazy-loaded to avoid Expo Go compatibility issues
// It will be imported only when needed, not at app startup
import PrayerHeader from "@/components/layout/header";
import { queryClient } from "@/lib/query/queryClient";
import { setupQueryManagers } from "@/lib/query/setup";
import { useAuthFlow } from "@/lib/hooks/useAuth";
import EmailConfirmationProvider from "@/components/auth/EmailConfirmationProvider";
import LocationPermissionProvider from "@/components/location/LocationPermissionProvider";
import { queryKeys } from "@/lib/query/queryKeys";
import { fetchPrayerTimes } from "@/lib/api/services/prayerTimes";
import { useLocationStore } from "@/lib/storage/locationStore";
import { useMethodStore } from "@/lib/storage/useMethodStore";
import { useDhikrSync } from "@/lib/hooks/dhikir/useDhikrSync";

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

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
    // Hide splash screen immediately if fonts are not used
    // or after fonts are loaded
    if (fontsLoaded !== undefined) {
      SplashScreen.hideAsync();
      // Small delay to ensure navigation is ready
      setTimeout(() => setIsNavigationReady(true), 100);
    }
  }, [fontsLoaded]);

  // Prefetch prayer times on app start and when location changes
  const location = useLocationStore((state) => state.location);
  const method = useMethodStore((state) => state.method?.id);
  
  useEffect(() => {
    // Method is always available (has default value), but we need to wait for it
    if (!method) return;
    
    // Use location if available, otherwise use default Istanbul coordinates
    const latitude = location?.latitude ?? 41.0082;
    const longitude = location?.longitude ?? 28.9784;

    queryClient.prefetchQuery({
      queryKey: queryKeys.prayerTimes.byLocation(latitude, longitude, method.toString()),
      queryFn: () =>
        fetchPrayerTimes({
          latitude,
          longitude,
          method,
        }),
      staleTime: 24 * 60 * 60 * 1000, // 24 saat
    });
  }, [location, method]);

  if (!fontsLoaded && fontsLoaded !== undefined) {
    return null;
  }

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
      <EmailConfirmationProvider />
      <LocationPermissionProvider />
      <DhikrSyncProvider />
      {!shouldShowRegister && <PrayerHeader />}
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
      </Stack>
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
