import clsx from "clsx";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/lib/storage/useThemeStore";

type SelectButtonProps<T extends string> = {
  readonly buttonData: {
    readonly key: T;
    readonly label: string;
  }[];
  readonly className?: string;
  readonly selectedFilter: T;
  readonly onPress: (key: T) => void;
};

export default function SelectButton<T extends string>({
  buttonData,
  className,
  selectedFilter,
  onPress,
}: SelectButtonProps<T>) {
  const { isDark } = useTheme();
  return (
    <View
      className={clsx(
        "flex-row gap-2 px-2 items-center justify-between w-full rounded-2xl",
        isDark ? "bg-background-cardDark" : "bg-background-cardLight"
      )}
    >
      {buttonData.map((button, index) => {
        const isActive = selectedFilter === button.key;

        return (
          <Pressable
            key={button.key}
            className={clsx(
              "flex-1 py-2",
              index === 0 && "rounded-l-2xl",
              index === buttonData.length - 1 && "rounded-r-2xl",
              isActive
                ? "bg-primary-500"
                : "bg-transparent"
            )}
            onPress={() => onPress(button.key)}
          >
            <Text
              className={clsx(
                "text-center",
                isActive ? "text-white" : "text-text-primaryLight"
              )}
            >
              {button.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}