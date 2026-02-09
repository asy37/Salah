import { MaterialIcons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { colors } from "../theme/colors";
import { useTheme } from "@/lib/storage/useThemeStore";

type ProgressCircleProps = {
  readonly percentage: number;
};

export default function ProgressCircle({ percentage }: ProgressCircleProps) {
  const { isDark } = useTheme();
  
  // Calculate rotation angle (0-360 degrees)
  const rotation = (percentage / 100) * 360;
  
  return (
    <View className="relative flex h-16 w-16 items-center justify-center">
      <View
        className="h-16 w-16 rounded-full border-[5px]"
        style={{
          borderColor: isDark
            ? colors.background.dark
            : colors.background.light,
        }}
      />
      <View
        className="absolute h-16 w-16 rounded-full border-[5px]"
        style={{
          borderColor: isDark ? colors.success : colors.primary[500],
          borderRightColor: rotation < 45 ? "transparent" : undefined,
          borderBottomColor: rotation < 135 ? "transparent" : undefined,
          borderLeftColor: rotation < 225 ? "transparent" : undefined,
          borderTopColor: rotation < 315 ? "transparent" : undefined,
          transform: [{ rotate: `${rotation}deg` }],
        }}
      />
      <View className="absolute flex items-center justify-center">
        {percentage === 100 ? (
          <MaterialIcons
            name="check"
            size={20}
            color={isDark ? colors.success : colors.primary[500]}
          />
        ) : (
          <Text
            className="text-xs font-bold"
            style={{
              color: isDark ? colors.success : colors.primary[500],
            }}
          >
            {percentage}%
          </Text>
        )}
      </View>
    </View>
  );
}
