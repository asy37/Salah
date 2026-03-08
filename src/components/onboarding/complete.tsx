import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import clsx from "clsx";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/lib/storage/useThemeStore";
import { useTranslation } from "@/i18n";
import Button from "@/components/button/Button";
import { storage } from "@/lib/storage/mmkv";
import { useAuthFlow } from "@/lib/hooks/auth/useAuth";

const ONBOARDING_COMPLETED_KEY = "onboarding_completed";

export default function OnboardingCompleteScreen() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { shouldShowRegister, canAccessApp } = useAuthFlow();

  const handleStart = async () => {
    await storage.set(ONBOARDING_COMPLETED_KEY, "true");
    if (shouldShowRegister) {
      router.replace("/auth/register");
    } else if (canAccessApp) {
      router.replace("/(tabs)");
    } else {
      router.replace("/auth/register");
    }
  };

  return (
    <View
      className={clsx(
        "flex-1 pt-12 px-8",
        isDark ? "bg-background-dark" : "bg-background-light"
      )}
    >
      <Pressable
        onPress={() => router.back()}
        className="flex-row items-center gap-1 mb-4"
      >
        <MaterialIcons
          name="arrow-back"
          size={24}
          color={isDark ? "#f5f5f5" : "#171717"}
        />
        <Text
          className={clsx(
            "text-base font-medium",
            isDark ? "text-text-primaryDark" : "text-text-primaryLight"
          )}
        >
          {t("common.back")}
        </Text>
      </Pressable>
      <View className="flex-1 justify-center items-center">
      <Text
        className={clsx(
          "text-2xl font-semibold text-center mb-3",
          isDark ? "text-text-primaryDark" : "text-text-primaryLight"
        )}
      >
        {t("onboarding.completeTitle")}
      </Text>
      <Text
        className={clsx(
          "text-base text-center max-w-[320px] mb-10",
          isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
        )}
      >
        {t("onboarding.completeMessage")}
      </Text>
      <Button
        text={t("onboarding.startButton")}
        onPress={handleStart}
        size="medium"
        backgroundColor="white"
        disabled={false}
      />
      </View>
    </View>
  );
}
