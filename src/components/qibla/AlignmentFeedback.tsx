import { MaterialIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import type { FeedbackLevel } from "@/lib/hooks/qibla/useQiblaGuide";
import { colors } from "@/components/theme/colors";

type AlignmentFeedbackProps = Readonly<{
  readonly feedbackLevel: FeedbackLevel;
}>;

export default function AlignmentFeedback({
  feedbackLevel,
}: AlignmentFeedbackProps) {
  if (feedbackLevel !== "aligned") return null;

  return (
    <View className="absolute bottom-44 items-center gap-1 opacity-100">
      <MaterialIcons name="check-circle" size={32} color={colors.success} />
      <Text className="text-sm font-medium tracking-wide text-success">
        You are aligned with the Kaaba
      </Text>
    </View>
  );
}
