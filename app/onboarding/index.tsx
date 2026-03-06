import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import clsx from "clsx";
import { useTheme } from "@/lib/storage/useThemeStore";
import { useTranslation } from "@/i18n";
import Button from "@/components/button/Button";

export default function OnboardingWelcomeScreen() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View
      className={clsx(
        "flex-1 justify-center items-center px-8",
        isDark ? "bg-background-dark" : "bg-background-light"
      )}
    >
      <Text
        className={clsx(
          "text-2xl font-semibold text-center mb-3",
          isDark ? "text-text-primaryDark" : "text-text-primaryLight"
        )}
      >
        {t("onboarding.welcomeTitle")}
      </Text>
      <Text
        className={clsx(
          "text-base text-center max-w-[320px] mb-10",
          isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
        )}
      >
        {t("onboarding.welcomeMessage")}
      </Text>
      <Button
        text={t("common.continue")}
        onPress={() => router.push("/onboarding/location")}
        size="medium"
        backgroundColor="primary"
      />
    </View>
  );
}
