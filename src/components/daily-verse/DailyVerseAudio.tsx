import { MaterialIcons } from "@expo/vector-icons"
import { Text, View } from "react-native"
import Button from "@/components/button/Button"
import { Ayah } from "@/types/quran";
import { useAudioStore } from "@/lib/storage/useQuranStore";
import { colors } from "@/components/theme/colors";

type DailyVerseAudioProps = Readonly<{
    dailyAyah: Ayah;
    isDark: boolean;
    handleAyahPress: (ayahNumber: number) => void;
}>;
export const DailyVerseAudio = ({ dailyAyah, isDark, handleAyahPress }: DailyVerseAudioProps) => {
    const { isPlaying } = useAudioStore();
    return (
        <View className="flex-row items-center justify-between">
            <View className=" items-center gap-2">
                <MaterialIcons name="share" size={24} color="primary-500" />
                <Text className="text-sm font-bold">Share</Text>
            </View>
            <Button onPress={() => handleAyahPress(dailyAyah.number)} isDark={isDark} className="p-5">
                <MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={24} color={colors.primary[500]} />
            </Button>
            <View className=" items-center gap-2">
                <MaterialIcons name="favorite" size={24} color="primary-500" />
                <Text className="text-sm font-bold">Share</Text>
            </View>
        </View>
    )
}