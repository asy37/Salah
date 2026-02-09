import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { colors } from "@/components/theme/colors";
import { useTheme } from "@/lib/storage/useThemeStore";

export default function TabLayout() {
  const { isDark } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? colors.primary[500] : colors.primary[500],
        tabBarInactiveTintColor: isDark ? colors.text.secondaryDark : colors.text.secondaryLight,
        tabBarStyle: {
          backgroundColor: isDark ? colors.background.dark : colors.background.light,
          borderTopColor: isDark ? colors.border.dark : colors.border.light,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Prayer",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="quran"
        options={{
          title: "Quran",
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="book-outline" size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="qibla"
        options={{
          title: "Qibla",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="infinite-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="adhan"
        options={{
          title: "Adhan",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="infinite-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
