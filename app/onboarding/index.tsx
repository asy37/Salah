import { View } from "react-native";
import clsx from "clsx";
import { useTheme } from "@/lib/storage/useThemeStore";
import Onboarding from "@/components/onboarding/Onboarding";

export default function OnboardingWelcomeScreen() {
  const { isDark } = useTheme();

  return (
    <View
      className={clsx(
        "flex-1 pt-12 px-8",
        isDark ? "bg-background-dark" : "bg-background-light"
      )}
    >
      <Onboarding />
    </View>
  );
}
