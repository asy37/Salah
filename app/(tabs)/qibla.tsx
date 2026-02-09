import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import clsx from "clsx";
import * as Haptics from "expo-haptics";
import QiblaHeader from "@/components/qibla/QiblaHeader";
import Compass from "@/components/qibla/Compass";
import AlignmentFeedback from "@/components/qibla/AlignmentFeedback";
import LocationInfo from "@/components/qibla/LocationInfo";
import AngleInfo from "@/components/qibla/AngleInfo";
import CalibrationHint from "@/components/qibla/CalibrationHint";
import { useLocation } from "@/lib/hooks/qibla/useLocation";
import { useLocationStore } from "@/lib/storage/locationStore";
import { useDeviceHeading } from "@/lib/hooks/useDeviceHeading";
import { useQiblaBearing } from "@/lib/hooks/qibla/useQiblaBearing";
import { useQiblaGuide } from "@/lib/hooks/qibla/useQiblaGuide";
import { useTheme } from "@/lib/storage/useThemeStore";

export default function QiblaTabScreen() {
  const BAD_ACCURACY_THRESHOLD = 1; // MVP: gerçek platform accuracy yoksa null döneriz

  const { isDark } = useTheme();

  const storedLocation = useLocationStore((s) => s.location);
  const {
    loading: locationLoading,
    error: locationError,
    requestLocation,
  } = useLocation();

  const location = storedLocation
    ? { lat: storedLocation.latitude, lng: storedLocation.longitude }
    : null;

    React.useEffect(() => {
    if (!location && !locationLoading && !locationError) {
      requestLocation();
    }
  }, [location, locationError, locationLoading, requestLocation]);

  const { heading, accuracy } = useDeviceHeading(100);
  const { qiblaBearing } = useQiblaBearing(location);
  const { angleDiff, feedbackLevel } = useQiblaGuide(heading, qiblaBearing);

  const alignedTriggeredRef = React.useRef(false);
  
  React.useEffect(() => {
    if (feedbackLevel === "aligned" && !alignedTriggeredRef.current) {
      alignedTriggeredRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
    }
    if (feedbackLevel !== "aligned") {
      alignedTriggeredRef.current = false;
    }
  }, [feedbackLevel]);

  const shouldShowCalibration = React.useMemo(() => {
    if (accuracy === null) return false;
    return accuracy <= BAD_ACCURACY_THRESHOLD;
  }, [accuracy]);

  const showLoading = locationLoading && !location;

  return (
    <View
      className={clsx(
        "flex-1",
        isDark ? "bg-background-dark" : "bg-background-light"
      )}
    >
      <QiblaHeader isDark={isDark} />

      <View className="flex-1 flex-col items-center justify-center relative">
        {showLoading ? (
          <View className="items-center justify-center gap-3">
            <ActivityIndicator />
            <Text
              className={clsx(
                "text-sm",
                isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
              )}
            >
              Location is being fetched…
            </Text>
          </View>
        ) : (
          <>
            <Compass
              isDark={isDark}
              heading={heading}
              qiblaBearing={qiblaBearing}
              feedbackLevel={feedbackLevel}
              angleDiff={angleDiff}
            />
            <AlignmentFeedback feedbackLevel={feedbackLevel} />
          </>
        )}
      </View>

      <View className="p-6 pb-8 z-10">
        <View className="flex-row items-center justify-between gap-4">
          <LocationInfo
            isDark={isDark}
            location={storedLocation}
            loading={locationLoading}
            error={locationError}
          />
          <AngleInfo
            angle={Math.round(Math.abs(angleDiff))}
            isDark={isDark}
            feedbackLevel={feedbackLevel}
          />
        </View>
        <CalibrationHint isDark={isDark} shouldShow={shouldShowCalibration} />
        {locationError && (
          <Text className="text-center text-xs mt-2 text-red-500">
            {locationError}
          </Text>
        )}
      </View>
    </View>
  );
}
