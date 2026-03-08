import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import clsx from "clsx";
import { useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/lib/storage/useThemeStore";
import { useTranslation } from "@/i18n";
import Button from "@/components/button/Button";
import { notificationService } from "@/lib/notifications/NotificationService";

export default function OnboardingNotificationsScreen() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<"allow" | "notNow" | null>(null);

  const handleAllowNotifications = async () => {
    setRequesting(true);
    await notificationService.requestPermissions();
    setRequesting(false);
    setHasResult(true);
    setSelectedChoice("allow");
  };

  const handleNotNow = () => {
    setHasResult(true);
    setSelectedChoice("notNow");
  };

  const handleContinue = () => {
    router.push("/onboarding/complete");
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
        {t("onboarding.notificationsTitle")}
      </Text>
      <Text
        className={clsx(
          "text-base text-center max-w-[320px] mb-8",
          isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
        )}
      >
        {t("onboarding.notificationsDescription")}
      </Text>
      <Button
        text={t("onboarding.notificationsAllow")}
        onPress={handleAllowNotifications}
        size="medium"
        backgroundColor="primary"
        disabled={requesting}
        isActive={selectedChoice === "allow"}
        className="mb-3 w-full max-w-[280px]"
      />
      <Button
        text={t("onboarding.notificationsNotNow")}
        onPress={handleNotNow}
        size="medium"
        backgroundColor="primary"
        isActive={selectedChoice === "notNow"}
        className="mb-4 w-full max-w-[280px]"
      />
      <Button
        text={t("common.continue")}
        onPress={handleContinue}
        size="medium"
        backgroundColor="white"
        disabled={!hasResult}
        className="w-full max-w-[280px]"
      />
      </View>
    </View>
  );
}
