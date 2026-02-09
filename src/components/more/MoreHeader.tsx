import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import clsx from "clsx";

export default function MoreHeader({ isDark }: { isDark: boolean }) {
  return (
    <View
      className={clsx(
        "pt-12 px-6 pb-2",
        isDark ? "bg-background-dark/95" : "bg-background-light/95"
      )}
    >
      <View className="flex-row items-center justify-between mb-4">
        <Text
          className={clsx(
            "text-3xl font-bold tracking-tight",
            isDark ? "text-text-primaryDark" : "text-text-primaryLight"
          )}
        >
          Daha Fazla
        </Text>
        <Pressable
          className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center"
          hitSlop={10}
        >
          <MaterialIcons
            name="notifications"
            size={24}
            color={isDark ? "#4CAF84" : "#1F8F5F"}
          />
        </Pressable>
      </View>
      <Text
        className={clsx(
          "text-base font-normal",
          isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
        )}
      >
        Ruhsal araçlar ve ayarlar
      </Text>
    </View>
  );
}

