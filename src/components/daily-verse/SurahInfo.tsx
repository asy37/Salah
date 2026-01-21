import { Ayah } from "@/types/quran";
import clsx from "clsx";
import { Text, View } from "react-native";

type SurahInfoProps = Readonly<{
  dailyAyah: Ayah;
  isDark: boolean;
}>;
export default function SurahInfo({ isDark, dailyAyah }: SurahInfoProps) {
  return (
    <>
      {/* Surah Info */}
      <View
        className={clsx(
          "inline-flex items-center justify-center px-5 py-1.5 rounded-full mb-8 border",
          isDark
            ? "bg-primary-500/20 border-primary-500/10"
            : "bg-primary-50 border-primary-500/10"
        )}
      >
        <Text
          className={clsx(
            "text-sm font-semibold tracking-wide",
            isDark ? "text-primary-300" : "text-primary-500"
          )}
        >
          Juz: {dailyAyah.juz}
        </Text>
        <Text
          className={clsx(
            "text-sm font-semibold tracking-wide",
            isDark ? "text-primary-300" : "text-primary-500"
          )}
        >
          Surah :{dailyAyah.surahArabicName + "/" + dailyAyah.surahTranslation}
        </Text>
        <Text
          className={clsx(
            "text-sm font-semibold tracking-wide",
            isDark ? "text-primary-300" : "text-primary-500"
          )}
        >
          Ayah Number: {dailyAyah.number}
        </Text>
      </View>
    </>
  );
}
