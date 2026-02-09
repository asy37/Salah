import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import clsx from "clsx";
import { backgroundColorClass, getIconColor, sizeClass, textColorClass } from "./utils";
import { useTheme } from "@/lib/storage/useThemeStore";

type ButtonProps = {
  readonly text?: string | number;
  readonly onPress: () => void;
  readonly rightIcon?: string;
  readonly leftIcon?: string;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly size?: "small" | "medium" | "large";
  readonly isActive?: boolean;
  readonly isIconActive?: boolean;
  readonly children?: React.ReactNode;
  readonly backgroundColor?: 'white' | 'transparent' | 'primary';
};
export default function Button({
  className,
  text,
  onPress,
  isIconActive = false,
  rightIcon,
  leftIcon,
  disabled = false,
  size = "medium",
  isActive = false,
  children,
  backgroundColor = "white",
}: ButtonProps) {

  const { isDark } = useTheme();

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={clsx(
        "flex-row items-center justify-between gap-2 rounded-full shadow-sm",
        isActive && "border-l-8 border-primary-500",
        sizeClass(size),
        backgroundColorClass(backgroundColor, isDark),
        className
      )}
    >
      <View className="flex-row items-center justify-start gap-2">
        {leftIcon && (
          <MaterialIcons
            className={clsx("text-end",
              isIconActive && "text-primary-500"
            )}
            name={leftIcon as keyof typeof MaterialIcons.glyphMap}
            size={18}
            color={getIconColor(isIconActive, isDark, backgroundColor)}
          />
        )}
        {text && (
          <Text
            className={clsx(
              "text-sm font-semibold text-center",
              textColorClass(backgroundColor, isDark),
            )}
          >
            {text}
          </Text>
        )}
        {children}
      </View>
      {rightIcon && (
        <MaterialIcons
          className={clsx("text-end",
            isIconActive && "text-primary-500"
          )}
          name={rightIcon as keyof typeof MaterialIcons.glyphMap}
          size={18}
          color={getIconColor(isIconActive, isDark, backgroundColor)}
        />
      )}
    </Pressable>
  );
}
