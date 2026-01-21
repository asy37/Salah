import { Text, View } from "react-native";
import type { FeedbackLevel } from "@/lib/hooks/qibla/useQiblaGuide";
import { getCompassColor } from "./utils";
import CompassRing from "./compass/CompassRing";
import CompassIcons from "./compass/CompassIcons";

type CompassProps = {
  readonly isDark: boolean;
  readonly heading: number | null;
  readonly qiblaBearing: number | null;
  readonly angleDiff: number;
  readonly feedbackLevel: FeedbackLevel;
};

export default function Compass({
  isDark,
  heading,
  qiblaBearing,
  angleDiff,
  feedbackLevel,
}: CompassProps) {
  const compassSize = 320;
  const dialRotation = heading == null ? 0 : -heading; // pusula arka planını kullanıcının yönüne göre döndür
  const qiblaRotation = qiblaBearing == null ? 0 : angleDiff; // kıble oku (relative)
  const accent = getCompassColor(feedbackLevel);

  return (
    <View className="relative items-center justify-center">
      {/* Subtitle (Dark theme only) */}
      {isDark && (
        <View className="z-10 text-center px-4 pb-4">
          <Text className="text-sm font-normal leading-normal opacity-80">
            Turn your direction to Kaaba
          </Text>
        </View>
      )}

      {/* Compass Circle Container */}
      <View
        className="relative items-center justify-center"
        style={{ width: compassSize, height: compassSize }}

      >
        {/* Compass Dial Background (rotates with device heading) */}
        <CompassRing
          compassSize={compassSize}
          isDark={isDark}
          dialRotation={dialRotation}
        />
        <CompassIcons
          dialRotation={dialRotation}
          qiblaRotation={qiblaRotation}
          accent={accent}
          compassSize={compassSize}
        />
      </View>
    </View>
  );
}
