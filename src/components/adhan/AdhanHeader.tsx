import { MaterialIcons } from "@expo/vector-icons";
import clsx from "clsx";
import { Pressable, Text, View } from "react-native";
import { useState } from "react";
import LocationPermissionModal from "./LocationPermissionModal";
import CalculationMethodModal from "./CalculationMethodModal";
import { useLocationStore } from "@/lib/storage/locationStore";
import { getLocationText } from "./utils/utils-function";
import { useMethodStore } from "@/lib/storage/useMethodStore";
import { PrayerCalculationMethod } from "@/constants/prayer-method";
import Button from "../button/Button";

type AdhanHeaderProps = {
  readonly isDark: boolean;
};

export default function AdhanHeader({ isDark }: AdhanHeaderProps) {
  const location = useLocationStore((state) => state.location);
  const setMethod = useMethodStore((state) => state.setMethod);
  const method = useMethodStore((state) => state.method);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showCalculationMethodModal, setShowCalculationMethodModal] =
    useState(false);

  const handleSelectCalculationMethod = () => {
    setShowCalculationMethodModal(true);
  };

  const handleCalculationMethodSelect = (method: PrayerCalculationMethod) => {
    setMethod(method);
    setShowCalculationMethodModal(false);
  };

  const locationText = getLocationText(location);

  return (
    <>
      <View
        className={clsx(
          "px-6 pt-8 pb-2",
          isDark ? "bg-background-dark/95" : "bg-background-light/95"
        )}
      >
        <Pressable
          onPress={() => setShowPermissionModal(true)}
          className="flex-col items-start w-full"
        >
          <View className="flex-row items-center gap-2">
            <MaterialIcons
              name="location-on"
              size={20}
              color={isDark ? "#4CAF84" : "#1F8F5F"}
            />
            <Text
              className={clsx(
                "text-sm font-medium tracking-wide uppercase opacity-90",
                isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
              )}
            >
              Current Location
            </Text>
          </View>
          <View className="flex-row items-center justify-between w-full mt-1">
            <Text
              className={clsx(
                "text-2xl font-bold leading-tight tracking-tight shrink",
                isDark ? "text-text-primaryDark" : "text-text-primaryLight"
              )}
            >
              {locationText}
            </Text>
            <Button
              rightIcon="settings"
              backgroundColor="transparent"
              onPress={handleSelectCalculationMethod}
            />
          </View>
          <Text className="text-sm text-text-secondaryDark">
            {method?.description ?? method?.label}
          </Text>
        </Pressable>
      </View>

      <LocationPermissionModal
        visible={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
      />

      <CalculationMethodModal
        visible={showCalculationMethodModal}
        onClose={() => setShowCalculationMethodModal(false)}
        onSelect={handleCalculationMethodSelect}
      />
    </>
  );
}
