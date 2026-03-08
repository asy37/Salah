import { Text, View } from "react-native";
import Button from "@/components/button/Button";
import clsx from "clsx";
import { useTheme } from "@/lib/storage/useThemeStore";
import { useRouter } from "expo-router";
import { useTranslation } from "@/i18n";

export default function Onboarding() {
    const { isDark } = useTheme();
    const { t } = useTranslation();
    const router = useRouter();
    return (
        <View className="flex-1 justify-center items-center">
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
                backgroundColor="white"
                disabled={false}
            />
        </View>
    )
}