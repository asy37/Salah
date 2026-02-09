import { ScrollView } from "react-native";
import clsx from "clsx";
import DailyVerseHeader from "@/components/daily-verse/DailyVerseHeader";
import DailyVerseCard from "@/components/daily-verse/DailyVerseCard";
import { useTheme } from "@/lib/storage/useThemeStore";

export default function DailyVerseScreen() {
  const { isDark } = useTheme();

  return (
    <ScrollView
      className={clsx(
        "flex-1 p-4",
        isDark ? "bg-background-dark" : "bg-background-light"
      )}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <DailyVerseHeader isDark={isDark} />
      <DailyVerseCard isDark={isDark} />
    </ScrollView>
  );
}
