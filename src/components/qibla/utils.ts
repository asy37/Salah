import { colors } from "@/components/theme/colors";
import { FeedbackLevel } from "@/lib/hooks/qibla/useQiblaGuide";

export const getCompassColor = (feedbackLevel: FeedbackLevel) => {
  switch (feedbackLevel) {
    case "far":
      return colors.error;
    case "near":
      return colors.warning;
    case "aligned":
      return colors.success;
  }
};