import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";
import { Ayah } from "@/types/quran";
import clsx from "clsx";
import { useAudioStore } from "@/lib/storage/useQuranStore";
import { splitAyahText } from "@/lib/quran/utils/wordSplitter";
import { useMemo } from "react";

type AyahBlockProps = Readonly<{
  ayah: Ayah;
  isDark: boolean;
  activeWordIndex?: number; // Aktif kelime index'i (highlight için)
  onAyahPress?: (ayahNumber: number) => void; // Ayet tıklandığında çağrılacak callback
}>;

export default function AyahBlock({
  ayah,
  isDark,
  activeWordIndex = -1,
  onAyahPress,
}: AyahBlockProps) {
  const {
    activeAyahNumber,
    isPlaying,
    setIsPlaying,
    setActiveAyahNumber,
  } = useAudioStore();


  // Ayet metnini kelimelere böl
  const words = useMemo(() => splitAyahText(ayah.text), [ayah.text]);
  const spokenIndexMap = useMemo(() => {
    let spokenIndex = -1;
    return words.map(word => {
      if (word.isPause) return -1;
      spokenIndex += 1;
      return spokenIndex;
    });
  }, [words]);
  const handlePress = (number: number) => {
    if (onAyahPress) {
      onAyahPress(number);
      return;
    }

    // Varsayılan davranış: eğer aynı ayet seçiliyse play/pause toggle
    if (activeAyahNumber === number) {
      setIsPlaying(!isPlaying);
    } else {
      setActiveAyahNumber(number);
      setIsPlaying(true);
    }
  };

  // Sadece bu ayet çalıyorsa pause ikonu göster
  const isCurrentAyahPlaying =
    activeAyahNumber === ayah.number && isPlaying;
  return (
    <View
      className={
        "group relative flex flex-col gap-6 border-b py-8 " +
        (isDark ? "bg-border- border-white" : "border-primary-400")
      }
    >
      <View className="flex flex-row items-center justify-between">
        <View
          className={
            "flex p-2 items-center justify-center rounded-full text-sm font-bold shadow-sm " +
            (isDark
              ? "bg-background-cardDark text-text-secondaryDark"
              : "bg-primary-400 text-white")
          }
        >
          <Text
            className={clsx(isDark ? colors.background.light : "text-white")}
          >
            {ayah.number}
          </Text>
        </View>

        <View className="flex flex-row gap-1 opacity-80">
          <TouchableOpacity
            onPress={() => {
              handlePress(ayah.number);
            }}
            className="rounded-full p-2 bg-primary-500/20"
          >
            <MaterialIcons
              name={isCurrentAyahPlaying ? "pause" : "play-arrow"}
              size={20}
              color={colors.success}
            />
          </TouchableOpacity>
          <Pressable className="rounded-full p-2">
            <MaterialIcons
              name="bookmark-border"
              size={20}
              color={
                isDark ? colors.text.primaryDark : colors.text.primaryLight
              }
            />
          </Pressable>
          <Pressable className="rounded-full p-2">
            <MaterialIcons
              name="share"
              size={20}
              color={
                isDark ? colors.text.primaryDark : colors.text.primaryLight
              }
            />
          </Pressable>
        </View>
      </View>

      {/* Kelime bazlı render - RTL (sağdan sola) */}
      <Text
        className={clsx(
          "text-right text-4xl leading-[42px]",
          isDark ? "text-text-primaryDark" : "text-text-primaryLight"
        )}
        style={{
          textAlign: "right",
          writingDirection: "rtl",
        }}
      >
        {words.map((word, index) => {
          const isActive =
            activeAyahNumber === ayah.number &&
            spokenIndexMap[index] === activeWordIndex;
          return (
            <Text
              key={`${ayah.number}-${index}`}
              className={clsx(isActive && "text-primary-500 font-bold")}
            >
              {word.raw}
              {index < words.length - 1 && " "}
            </Text>
          );
        })}
      </Text>
      {ayah.translationText && (
        <Text
          className={
            "text-[17px] leading-relaxed tracking-wide " +
            (isDark ? "text-text-secondaryDark" : "text-text-secondaryLight")
          }
        >
          {ayah.translationText}
        </Text>
      )}
    </View>
  );
}
