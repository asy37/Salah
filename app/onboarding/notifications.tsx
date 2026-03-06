import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import clsx from "clsx";
import { useState } from "react";
import { useTheme } from "@/lib/storage/useThemeStore";
import { useTranslation } from "@/i18n";
import Button from "@/components/button/Button";
import { notificationService } from "@/lib/notifications/NotificationService";

export default function OnboardingNotificationsScreen() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);

  const handleAllowNotifications = async () => {
    setRequesting(true);
    await notificationService.requestPermissions();
    setRequesting(false);
  };

  const handleContinue = () => {
    router.push("/onboarding/complete");
  };

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
        className="mb-3 w-full max-w-[280px]"
      />
      <Button
        text={t("common.continue")}
        onPress={handleContinue}
        size="medium"
        backgroundColor="primary"
        className="w-full max-w-[280px]"
      />
    </View>
  );
}
