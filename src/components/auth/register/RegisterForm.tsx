import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import clsx from "clsx";
import { router } from "expo-router";
import { signUp, signInAnonymously } from "@/lib/api/services/auth";
import {
    Alert,
    ScrollView,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { RegisterFormData, registerSchema } from "./schema";
import AvatarPicker from "@/components/form/AvatarPicker";
import FormField from "@/components/form/FormField";

// Helper functions

const handleSignUpSuccess = () => {
    setTimeout(() => router.replace("/(tabs)"), 500);
};

const handleSignUpError = (error: Error) => {
    Alert.alert("Kayıt Hatası", error.message);
};

const handleSignUpFailure = () => {
    Alert.alert("Hata", "Kayıt olurken bir sorun oluştu. Lütfen tekrar deneyin.");
};

const handleGuestSuccess = () => {
    setTimeout(() => router.replace("/(tabs)"), 500);
};

const handleGuestError = (error: Error) => {
    Alert.alert("Hata", error.message);
};

const handleGuestFailure = () => {
    Alert.alert("Hata", "Misafir girişi yapılırken bir sorun oluştu. Lütfen tekrar deneyin.");
};





export default function RegisterForm() {
    const isDark = useColorScheme() === "dark";
    const [isLoading, setIsLoading] = useState(false);
    const [avatar, setAvatar] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: "",
            password: "",
            name: "",
            surname: "",
        },
    });

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("İzin Gerekli", "Fotoğraf seçmek için izin gerekli");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setAvatar(result.assets[0].uri);
        }
    };

    const onSubmit = async (data: RegisterFormData) => {
        setIsLoading(true);
        try {
            const result = await signUp({
                email: data.email,
                password: data.password,
                name: data.name || undefined,
                surname: data.surname || undefined,
                image: avatar ?? undefined,
            });

            if (result.error) {
                handleSignUpError(result.error);
                return;
            }

            if (result.user) {
                handleSignUpSuccess();
            } else {
                handleSignUpFailure();
            }
        } catch {
            Alert.alert("Hata", "Kayıt olurken bir hata oluştu");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGuestContinue = async () => {
        setIsLoading(true);
        try {
            const result = await signInAnonymously();
            if (result.error) {
                handleGuestError(result.error);
                return;
            }
            if (result.user || result.session) {
                handleGuestSuccess();
            } else {
                handleGuestFailure();
            }
        } catch {
            Alert.alert("Hata", "Misafir girişi başarısız");
        } finally {
            setIsLoading(false);
        }
    };

    const passwordRightIcon = (
        <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
        >
            <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={20} color={isDark ? "#8FA6A0" : "#6B7F78"} />
        </TouchableOpacity>
    );

    return (
        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            <View className="px-6 pt-4">
                <AvatarPicker avatar={avatar} onPickImage={pickImage} />

                <View style={{ gap: 20 }}>
                    <FormField
                        label="Ad (isteğe bağlı)"
                        name="name"
                        control={control}
                        placeholder="Adınız"
                        isLoading={isLoading}
                        autoCapitalize="words"
                    />

                    <FormField
                        label="Soyad (isteğe bağlı)"
                        name="surname"
                        control={control}
                        placeholder="Soyadınız"
                        isLoading={isLoading}
                        autoCapitalize="words"
                    />

                    <FormField
                        label="Email Adresi"
                        name="email"
                        control={control}
                        placeholder="ornek@email.com"
                        error={errors.email?.message}
                        isLoading={isLoading}
                        keyboardType="email-address"
                        autoComplete="email"
                        rightIcon={<MaterialIcons name="mail" size={20} color={isDark ? "#8FA6A0" : "#6B7F78"} />}
                    />

                    <FormField
                        label="Şifre"
                        name="password"
                        control={control}
                        placeholder="••••••••"
                        error={errors.password?.message}
                        isLoading={isLoading}
                        autoComplete="password"
                        secureTextEntry={!showPassword}
                        rightIcon={passwordRightIcon}
                    />

                    <TouchableOpacity
                        onPress={handleSubmit(onSubmit)}
                        disabled={isLoading}
                        className={clsx("mt-4 h-14 rounded-xl items-center justify-center shadow-sm", isLoading ? "bg-primary-400" : "bg-primary-500")}
                    >
                        <Text className="text-white text-base font-bold">{isLoading ? "Kayıt yapılıyor..." : "Kayıt Ol"}</Text>
                    </TouchableOpacity>
                </View>

                {/* Divider */}
                <View className="flex-row items-center my-8" style={{ gap: 16 }}>
                    <View className={clsx("flex-1 h-px", isDark ? "bg-border-dark" : "bg-gray-200")} />
                    <Text className={clsx("text-xs font-medium uppercase", isDark ? "text-text-secondaryDark" : "text-text-secondaryLight")}>
                        veya
                    </Text>
                    <View className={clsx("flex-1 h-px", isDark ? "bg-border-dark" : "bg-gray-200")} />
                </View>

                {/* Social (Disabled) */}
                <View className="flex-row mb-6 opacity-50" style={{ gap: 16 }}>
                    <TouchableOpacity disabled className={clsx("flex-1 h-12 rounded-xl border items-center justify-center gap-2", isDark ? "bg-background-cardDark border-border-dark" : "bg-white border-gray-200")}>
                        <Text className={clsx("text-sm font-medium", isDark ? "text-text-primaryDark" : "text-text-primaryLight")}>Google</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled className={clsx("flex-1 h-12 rounded-xl border items-center justify-center gap-2", isDark ? "bg-background-cardDark border-border-dark" : "bg-white border-gray-200")}>
                        <Text className={clsx("text-sm font-medium", isDark ? "text-text-primaryDark" : "text-text-primaryLight")}>Apple</Text>
                    </TouchableOpacity>
                </View>

                {/* Misafir */}
                <View className="items-center mb-4">
                    <TouchableOpacity onPress={handleGuestContinue} disabled={isLoading}>
                        <Text className={clsx("text-sm font-semibold", isDark ? "text-text-secondaryDark" : "text-text-secondaryLight", isLoading && "opacity-50")}>
                            Misafir olarak devam et
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}
