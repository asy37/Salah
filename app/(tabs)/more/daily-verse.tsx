import { ScrollView, useColorScheme } from "react-native";
import clsx from "clsx";
import DailyVerseHeader from "@/components/daily-verse/DailyVerseHeader";
import DailyVerseCard from "@/components/daily-verse/DailyVerseCard";
import DateInfo from "@/components/daily-verse/DateInfo";

export default function DailyVerseScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

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
      <DateInfo isDark={isDark} />
      <DailyVerseCard isDark={isDark} />
    </ScrollView>
  );
}
