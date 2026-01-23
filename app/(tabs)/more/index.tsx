import { ScrollView, useColorScheme, View, Alert } from "react-native";
import { useRouter } from "expo-router";
import clsx from "clsx";
import MoreHeader from "@/components/more/MoreHeader";
import MenuSection from "@/components/more/MenuSection";
import PremiumCard from "@/components/more/PremiumCard";
import VersionInfo from "@/components/more/VersionInfo";
import { signOut } from "@/lib/api/services/auth";
import { supabase } from "@/lib/supabase/client";

const TOOLS_ITEMS = [
  {
    key: "dhikr",
    title: "Dhikr Tracker",
    subtitle: "Daily dhikr tracker",
    icon: "timer",
    iconBg: "primary" as const,
    route: "./more/dhikr",
  },
  {
    key: "daily-verse",
    title: "Daily Verse",
    subtitle: "Your daily verse",
    icon: "menu-book",
    iconBg: "primary" as const,
    route: "./more/daily-verse",
  },
  {
    key: "prayers",
    title: "My Dua Notebook",
    subtitle: "My dua journal",
    icon: "volunteer-activism",
    iconBg: "primary" as const,
    route: "./more/duas",
  },
] as const;


export default function MoreScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      "Çıkış Yap",
      "Çıkış yapmak istediğinize emin misiniz?",
      [
        {
          text: "İptal",
          style: "cancel",
        },
        {
          text: "Çıkış Yap",
          style: "destructive",
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert("Hata", error.message);
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

  const ACCOUNT_ITEMS = [
    {
      key: "profile",
      title: "Profil",
      icon: "person",
      iconBg: "gray" as const,
      route: "./more/profile",
    },
    {
      key: "settings",
      title: "Ayarlar",
      icon: "settings",
      iconBg: "gray" as const,
      route: "./more/settings",
    },
    {
      key: "logout",
      title: "Çıkış Yap",
      icon: "logout",
      iconBg: "gray" as const,
      onPress: handleLogout,
    },
  ] as const;

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
        <MenuSection title="Hesap" items={ACCOUNT_ITEMS} isDark={isDark} />
        <PremiumCard isDark={isDark} />
        <VersionInfo isDark={isDark} />
      </View>
    </ScrollView>
  );
}
