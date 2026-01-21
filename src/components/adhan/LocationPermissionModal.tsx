import { Image, Text, View, useColorScheme } from "react-native";
import clsx from "clsx";
import { useLocation } from "@/lib/hooks/qibla/useLocation";
import ModalComponent from "@/components/modal/ModalComponent";
import Button from "../button/Button";
import ManualLocationModal from "./manuel-location/ManualLocationModal";
import { queryKeys } from "@/lib/query/queryKeys";
import { useLocationStore, UserLocation } from "@/lib/storage/locationStore";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { storage } from "@/lib/storage/mmkv";

type LocationPermissionModalProps = {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onPermissionGranted?: () => void;
};

const LOCATION_PERMISSION_ASKED_KEY = "location_permission_asked";
const LOCATION_PERMISSION_GRANTED_KEY = "location_permission_granted";

export default function LocationPermissionModal({
  visible,
  onClose,
  onPermissionGranted,
}: LocationPermissionModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const setLocation = useLocationStore((state) => state.setLocation);
  const queryClient = useQueryClient();
  const [showManualModal, setShowManualModal] = React.useState(false);

  const { requestLocation, permissionStatus } = useLocation();
  const handleRequestPermission = async () => {
    await requestLocation();
    if (permissionStatus === "granted") {
      onPermissionGranted?.();
    }
    onClose();
  };
  const handleManualEntry = async () => {
    await storage.set(LOCATION_PERMISSION_ASKED_KEY, "true");
    await storage.set(LOCATION_PERMISSION_GRANTED_KEY, "false");
    setShowManualModal(true);
  };

  const handleSelectLocation = (selectedLocation: UserLocation) => {
    setLocation(selectedLocation);
    setShowManualModal(false);
    queryClient.invalidateQueries({
      queryKey: queryKeys.prayerTimes.all,
    });
    onClose();
  };
  return (
    <ModalComponent
      isDark={isDark}
      visible={visible}
      onClose={onClose}
      title="Location Permission"
    >
      <View className="w-[280px] aspect-square rounded-xl overflow-hidden">
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
          "text-base font-normal leading-relaxed text-center max-w-[340px]",
          isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
        )}
      >
        Doğru namaz vakitleri ve kıble yönü için konumunuza ihtiyacımız var.
        Gizliliğinize saygı gösteriyoruz.
      </Text>
      <Button
        leftIcon="near-me"
        size="medium"
        onPress={handleRequestPermission}
        isDark={isDark}
        text="Konum Erişimine İzin Ver"
        backgroundColor="primary"
      />
      <Button
        onPress={handleManualEntry}
        size="medium"
        leftIcon="near-me"
        isDark={isDark}
        text="Şehrimi manuel olarak gireceğim"
        backgroundColor="primary"
      />
      <ManualLocationModal
        visible={showManualModal}
        onSelectLocation={handleSelectLocation}
        onClose={() => setShowManualModal(false)}
      />
    </ModalComponent>
  );
}
