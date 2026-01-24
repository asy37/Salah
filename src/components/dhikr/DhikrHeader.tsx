import { View } from "react-native";
import Button from "@/components/button/Button";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "@/components/theme/colors";

type DhikrHeaderProps = {
    readonly isDark: boolean;
    readonly setOpenAddDhikrModal: (value: boolean) => void;
};
export default function DhikrHeader({ isDark, setOpenAddDhikrModal }: DhikrHeaderProps) {
    return (
        <View className="w-full flex-row items-center justify-between px-4">
            <Button onPress={() => router.back()} size="small">
                <MaterialIcons
                    name="arrow-back"
                    size={24}
                    color={isDark ? colors.text.primaryDark : colors.text.primaryLight}
                />
            </Button>
            <Button onPress={() => setOpenAddDhikrModal(true)} size="small">
                <MaterialIcons name="add" size={24} color={isDark ? "white" : "black"} />
            </Button>
        </View>
    );
}