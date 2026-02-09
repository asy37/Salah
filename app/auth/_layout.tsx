import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, Text, View } from "react-native";
import clsx from "clsx";
import React from "react";
import SelectButton from "@/components/button/SelectButton";
import { useTheme } from "@/lib/storage/useThemeStore";

type AuthMode = "login" | "register";

const AUTH_BUTTONS: { key: AuthMode; label: string }[] = [
  { key: "login", label: "Login" },
  { key: "register", label: "Register" },
];

export default function AuthLayout() {
  const [RegisterOrLogin, setRegisterOrLogin] = React.useState<'register' | 'login'>('register');
  const router = useRouter()
  const { isDark } = useTheme();

  const handleAuthChange = (mode: AuthMode) => {
    setRegisterOrLogin(mode);
    router.replace(`/auth/${mode}`);
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-primary-100">
      {/* Headlines */}
      <View className="items-center gap-4 px-4">
        <Text className={clsx("text-[32px] font-bold leading-tight mb-3", isDark ? "text-text-primaryDark" : "text-text-primaryLight")}>
          Welcome!
        </Text>
        <Text className={clsx("text-base font-normal leading-relaxed text-center px-4", isDark ? "text-text-secondaryDark" : "text-text-secondaryLight")}>
          Follow your prayers and find your daily motivation.
        </Text>
        <SelectButton<AuthMode>
          buttonData={AUTH_BUTTONS}
          selectedFilter={RegisterOrLogin}
          onPress={handleAuthChange}
        />
      </View>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="confirmation" />
      </Stack>
    </SafeAreaView>
  );
}

