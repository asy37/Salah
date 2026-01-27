import { MaterialIcons } from "@expo/vector-icons";
import clsx from "clsx";
import { Image, Text, TouchableOpacity, useColorScheme, View } from "react-native";

// Avatar Picker Component
type AvatarPickerProps = Readonly<{
    avatar: string | null;
    onPickImage: () => Promise<void>;
}>;

export default function AvatarPicker({ avatar, onPickImage }: AvatarPickerProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    return (
        <View className="items-center py-6" style={{ gap: 16 }}>
            <TouchableOpacity
                onPress={onPickImage}
                className={clsx(
                    "w-28 h-28 rounded-full border-2 border-dashed items-center justify-center",
                    isDark ? "bg-background-cardDark border-border-dark" : "bg-white border-gray-300"
                )}
            >
                {avatar ? (
                    <Image source={{ uri: avatar }} className="w-full h-full rounded-full" />
                ) : (
                    <MaterialIcons name="add-a-photo" size={32} color={isDark ? "#8FA6A0" : "#6B7F78"} />
                )}
            </TouchableOpacity>
            <Text className={clsx("text-sm font-medium", isDark ? "text-text-secondaryDark" : "text-text-secondaryLight")}>
                Fotoğraf ekle (isteğe bağlı)
            </Text>
        </View>
    );
}