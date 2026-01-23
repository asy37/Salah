import { Text, View } from "react-native";
import clsx from "clsx";
import DuaCard from "./DuaCard";

type Dua = {
  id: string;
  date: string;
  text: string;
  title: string;
  isFavorite: boolean;
};

type DuasListProps = {
  readonly duas: readonly Dua[];
  readonly isDark: boolean;
};

export default function DuasList({ duas, isDark }: DuasListProps) {
  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between mt-2 mb-1 px-1">
        <Text
          className={clsx(
            "text-lg font-bold",
            isDark ? "text-text-primaryDark" : "text-text-primaryLight"
          )}
        >
          Your Prayers
        </Text>
        <View
          className={clsx(
            "px-2 py-1 rounded-md",
            isDark ? "bg-background-cardDark/50" : "bg-background-cardLight/50"
          )}
        >
          <Text
            className={clsx(
              "text-xs font-medium",
              isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
            )}
          >
            {duas.length} entries
          </Text>
        </View>
      </View>
      {duas.map((dua) => (
        <DuaCard key={dua.id} dua={dua} isDark={isDark} />
      ))}
    </View>
  );
}

