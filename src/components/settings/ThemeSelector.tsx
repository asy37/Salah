import { Pressable, Text, View } from "react-native";
import clsx from "clsx";
import { useThemeStore, useTheme, type ThemeOption } from "@/lib/storage/useThemeStore";

export default function ThemeSelector() {
  const { isDark } = useTheme();
  const selectedTheme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const themes: { key: ThemeOption; label: string }[] = [
    { key: "light", label: "Light" },
    { key: "dark", label: "Dark" },
    { key: "system", label: "System" },
  ];

  return (
    <View className="flex-row items-center justify-between p-4">
      <Text
        className={clsx(
          "text-base font-medium",
          isDark ? "text-text-primaryDark" : "text-text-primaryLight"
        )}
      >
        App Theme
      </Text>
      <View
        className="flex-row p-1 rounded-lg"
        style={{
          backgroundColor: isDark
            ? "rgba(255, 255, 255, 0.05)"
            : "#EEF1EF",
        }}
      >
        {themes.map((theme) => {
          const isActive = selectedTheme === theme.key;
          return (
            <Pressable
              key={theme.key}
              onPress={() => setTheme(theme.key)}
              className={clsx(
                "px-4 py-1.5 rounded-md",
                isActive
                  ? isDark
                    ? "bg-white/10"
                    : "bg-white"
                  : "bg-transparent"
              )}
              style={{
                shadowColor: isActive ? "#000" : "transparent",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isActive ? 0.1 : 0,
                shadowRadius: 2,
                elevation: isActive ? 1 : 0,
              }}
            >
              <Text
                className={clsx(
                  "text-sm",
                  isActive
                    ? "font-semibold"
                    : "font-medium",
                  isActive
                    ? isDark
                      ? "text-text-primaryDark"
                      : "text-text-primaryLight"
                    : isDark
                    ? "text-text-secondaryDark"
                    : "text-text-secondaryLight"
                )}
              >
                {theme.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

