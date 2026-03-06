import { Image, Text, View } from "react-native";
import { useRouter } from "expo-router";
import clsx from "clsx";
import React, { useState } from "react";
import { useLocation } from "@/lib/hooks/qibla/useLocation";
import Button from "@/components/button/Button";
import ManualLocationModal from "@/components/adhan/manuel-location/ManualLocationModal";
import { queryKeys } from "@/lib/query/queryKeys";
import { useLocationStore, UserLocation } from "@/lib/storage/locationStore";
import { useQueryClient } from "@tanstack/react-query";
import { storage } from "@/lib/storage/mmkv";
import { useTheme } from "@/lib/storage/useThemeStore";
import { useTranslation } from "@/i18n";

const LOCATION_PERMISSION_ASKED_KEY = "location_permission_asked";
const LOCATION_PERMISSION_GRANTED_KEY = "location_permission_granted";

export default function OnboardingLocationScreen() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const setLocation = useLocationStore((state) => state.setLocation);
  const queryClient = useQueryClient();
  const [showManualModal, setShowManualModal] = useState(false);

  const { requestLocation } = useLocation();

  const handleRequestPermission = async () => {
    await requestLocation();
    router.push("/onboarding/notifications");
  };

  const handleManualEntry = async () => {
    await storage.set(LOCATION_PERMISSION_ASKED_KEY, "true");
    await storage.set(LOCATION_PERMISSION_GRANTED_KEY, "false");
    setShowManualModal(true);
  };

  const handleSelectLocation = (selectedLocation: UserLocation) => {
    setLocation(selectedLocation);
    setShowManualModal(false);
    queryClient.invalidateQueries({ queryKey: queryKeys.prayerTimes.all });
    router.push("/onboarding/notifications");
  };

  return (
    <View
      className={clsx(
        "flex-1 justify-center items-center px-8",
        isDark ? "bg-background-dark" : "bg-background-light"
      )}
    >
      <View className="w-[280px] aspect-square rounded-xl overflow-hidden mb-6">
        <Image
          source={{
            uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuB9fE1Xovp9VwziN1mba7pVKP903EzR-MYa7Uo8lvgrEAUHOu-Do02cZbkIAK-OBNEdBs31X4wBFMiJYZzfj-WDYk1Pc9nNQw1TDywJ1EyqnyLLdrvSDKhXBVbor2-9OkSOvTjNfcBIeUXrml0HJ5TKIKOsZ_uubLM4TuPOfKdCl2-rJ5c3ECX2ScrVQdAzVa2f0KWc0ttX4RoAQqBRUWEZpQiy5chZ_oFrCCch7GyJhW2VulZsOCm67JWBm4uFH7udAmzjLwVJIZ8p",
          }}
          className="w-full max-w-[280px] aspect-square rounded-xl"
          resizeMode="contain"
        />
      </View>
      <Text
        className={clsx(
          "text-base font-normal leading-relaxed text-center max-w-[340px] mb-8",
          isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
        )}
      >
        {t("onboarding.locationDescription")}
      </Text>
      <Button
        leftIcon="near-me"
        size="medium"
        onPress={handleRequestPermission}
        text={t("onboarding.locationAllow")}
        backgroundColor="primary"
        className="mb-3 w-full max-w-[280px]"
      />
      <Button
        onPress={handleManualEntry}
        size="medium"
        leftIcon="near-me"
        text={t("onboarding.locationManual")}
        backgroundColor="primary"
        className="w-full max-w-[280px]"
      />
      <ManualLocationModal
        visible={showManualModal}
        onSelectLocation={handleSelectLocation}
        onClose={() => setShowManualModal(false)}
      />
    </View>
  );
}
