import { ScrollView, View, Alert } from "react-native";
import { useRouter } from "expo-router";
import clsx from "clsx";
import MoreHeader from "@/components/more/MoreHeader";
import MenuSection from "@/components/more/MenuSection";
import PremiumCard from "@/components/more/PremiumCard";
import VersionInfo from "@/components/more/VersionInfo";
import { signOut } from "@/lib/api/services/auth";
import { supabase } from "@/lib/supabase/client";
import { useTheme } from "@/lib/storage/useThemeStore";
import { useTranslation } from "@/i18n";

export default function MoreScreen() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      t("more.logoutConfirmTitle"),
      t("more.logoutConfirmMessage"),
      [
        {
          text: t("more.cancel"),
          style: "cancel",
        },
        {
          text: t("more.logout"),
          style: "destructive",
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert(t("more.error"), error.message);
            } else {
              // Wait for auth state to update before navigating
              // Check session is actually cleared
              let attempts = 0;
              const maxAttempts = 50; // 5 seconds max wait (50 * 100ms)
              
              const checkSession = async () => {
                attempts++;
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                  // Session cleared, navigate to register
                  router.replace("/auth/register");
                } else if (attempts < maxAttempts) {
                  // Session still exists, wait a bit and check again
                  setTimeout(checkSession, 100);
                } else {
                  // Max attempts reached, force navigation anyway
                  console.warn("Session check timeout, forcing navigation");
                  router.replace("/auth/register");
                }
              };
              // Start checking after a short delay to allow state to update
              setTimeout(checkSession, 100);
            }
          },
        },
      ]
    );
  };

  const TOOLS_ITEMS = [
    { key: "dhikr", title: t("more.dhikrTracker"), subtitle: t("more.dhikrSubtitle"), icon: "timer", iconBg: "primary" as const, route: "./more/dhikr" },
    { key: "daily-verse", title: t("more.dailyVerse"), subtitle: t("more.dailyVerseSubtitle"), icon: "menu-book", iconBg: "primary" as const, route: "./more/daily-verse" },
    { key: "prayers", title: t("more.myDuaNotebook"), subtitle: t("more.myDuaSubtitle"), icon: "volunteer-activism", iconBg: "primary" as const, route: "./more/duas" },
  ];
  const ACCOUNT_ITEMS = [
    { key: "profile", title: t("more.profile"), icon: "person", iconBg: "gray" as const, route: "./more/profile" },
    { key: "settings", title: t("more.settings"), icon: "settings", iconBg: "gray" as const, route: "./more/settings" },
    { key: "logout", title: t("more.logout"), icon: "logout", iconBg: "gray" as const, onPress: handleLogout },
  ];

  return (
    <ScrollView
      className={clsx(
        "flex-1",
        isDark ? "bg-background-dark" : "bg-background-light"
      )}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <MoreHeader isDark={isDark} />
      <View className="flex-1 px-4 mt-4 space-y-6">
        <MenuSection title="" items={TOOLS_ITEMS} isDark={isDark} />
        {/* <MenuSection
          title="Konum Servisleri"
          items={LOCATION_ITEMS}
          isDark={isDark}
        /> */}
        <MenuSection title={t("more.account")} items={ACCOUNT_ITEMS} isDark={isDark} />
        <PremiumCard isDark={isDark} />
        <VersionInfo isDark={isDark} />
      </View>
    </ScrollView>
  );
}
