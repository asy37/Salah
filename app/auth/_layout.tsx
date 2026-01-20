import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable, Text, useColorScheme, View } from "react-native";
import clsx from "clsx";
import React from "react";

export default function AuthLayout() {
  const [RegisterOrLogin, setRegisterOrLogin] = React.useState<'register' | 'login'>('register');
  const router = useRouter()
  const isDark = useColorScheme() === "dark";
  const handleRegister = () => {
    setRegisterOrLogin('register');
    router.replace("/auth/register");
  };
  const handleLogin = () => {
    setRegisterOrLogin('login');
    router.replace("/auth/login");
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
        <View className={clsx("flex-row gap-2 px-2 items-center justify-between w-full rounded-2xl",
          isDark ? "bg-background-cardDark" : "bg-background-cardLight"
        )}>
          <Pressable className={clsx('w-1/2 py-2 shrink-0 rounded-l-2xl',
            RegisterOrLogin === 'login' ? "bg-primary-500 text-white" : "bg-transparent text-text-primaryLight"
          )} onPress={handleLogin} >
            <Text className={clsx('text-center',
              RegisterOrLogin === 'login' ? "text-white" : "text-text-primaryLight"
            )}>
              Login
            </Text>
          </Pressable>
          <Pressable className={clsx('text-center w-1/2 py-2 shrink-0 rounded-r-2xl',
            RegisterOrLogin === 'register' ? "bg-primary-500 text-white" : "bg-transparent text-text-primaryLight"
          )} onPress={handleRegister} >
            <Text className={clsx('text-center',
              RegisterOrLogin === 'register' ? "text-white" : "text-text-primaryLight"
            )}>
              Register
            </Text>
          </Pressable>
        </View>
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

