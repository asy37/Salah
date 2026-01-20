import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import clsx from "clsx";
import { router } from "expo-router";
import { signUp, signInAnonymously } from "@/lib/api/services/auth";
import {
    Alert,
    Image,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { RegisterFormData, registerSchema } from "./schema";

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
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
                Alert.alert("Kayıt Hatası", result.error.message);
                return;
            }

            if (result.user) {
                setTimeout(() => router.replace("/(tabs)"), 500);
            } else {
                Alert.alert("Hata", "Kayıt olurken bir sorun oluştu. Lütfen tekrar deneyin.");
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
                Alert.alert("Hata", result.error.message);
                return;
            }
            if (result.user || result.session) {
                setTimeout(() => router.replace("/(tabs)"), 500);
            } else {
                Alert.alert("Hata", "Misafir girişi yapılırken bir sorun oluştu. Lütfen tekrar deneyin.");
            }
        } catch {
            Alert.alert("Hata", "Misafir girişi başarısız");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            <View className="px-6 pt-4">

                {/* Avatar */}
                <View className="items-center py-6" style={{ gap: 16 }}>
                    <TouchableOpacity
                        onPress={pickImage}
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
                {/* Form */}
                <View style={{ gap: 20 }}>
                    {/* Name */}
                    <View style={{ gap: 8 }}>
                        <Text className={clsx("text-sm font-medium ml-1", isDark ? "text-text-secondaryDark" : "text-text-primaryLight")}>
                            Ad (isteğe bağlı)
                        </Text>
                        <Controller
                            control={control}
                            name="name"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    className={clsx(
                                        "w-full h-14 rounded-xl border px-4 text-base",
                                        isDark ? "bg-background-cardDark border-border-dark text-text-primaryDark" : "bg-white border-gray-200 text-text-primaryLight"
                                    )}
                                    placeholder="Adınız"
                                    placeholderTextColor={isDark ? "#8FA6A0" : "#6B7F78"}
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    autoCapitalize="words"
                                    editable={!isLoading}
                                />
                            )}
                        />
                    </View>

                    {/* Surname */}
                    <View style={{ gap: 8 }}>
                        <Text className={clsx("text-sm font-medium ml-1", isDark ? "text-text-secondaryDark" : "text-text-primaryLight")}>
                            Soyad (isteğe bağlı)
                        </Text>
                        <Controller
                            control={control}
                            name="surname"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    className={clsx(
                                        "w-full h-14 rounded-xl border px-4 text-base",
                                        isDark ? "bg-background-cardDark border-border-dark text-text-primaryDark" : "bg-white border-gray-200 text-text-primaryLight"
                                    )}
                                    placeholder="Soyadınız"
                                    placeholderTextColor={isDark ? "#8FA6A0" : "#6B7F78"}
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    autoCapitalize="words"
                                    editable={!isLoading}
                                />
                            )}
                        />
                    </View>

                    {/* Email */}
                    <View style={{ gap: 8 }}>
                        <Text className={clsx("text-sm font-medium ml-1", isDark ? "text-text-secondaryDark" : "text-text-primaryLight")}>
                            Email Adresi
                        </Text>
                        <Controller
                            control={control}
                            name="email"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <View style={{ position: "relative" }}>
                                    <TextInput
                                        className={clsx(
                                            "w-full h-14 rounded-xl border px-4 pr-12 text-base",
                                            isDark ? "bg-background-cardDark border-border-dark text-text-primaryDark" : "bg-white border-gray-200 text-text-primaryLight",
                                            errors.email && "border-red-500"
                                        )}
                                        placeholder="ornek@email.com"
                                        placeholderTextColor={isDark ? "#8FA6A0" : "#6B7F78"}
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        editable={!isLoading}
                                    />
                                    <View style={{ position: "absolute", right: 16, top: "50%", marginTop: -10 }}>
                                        <MaterialIcons name="mail" size={20} color={isDark ? "#8FA6A0" : "#6B7F78"} />
                                    </View>
                                </View>
                            )}
                        />
                        {errors.email && <Text className="text-red-500 text-sm ml-1">{errors.email.message}</Text>}
                    </View>

                    {/* Password */}
                    <View style={{ gap: 8 }}>
                        <Text className={clsx("text-sm font-medium ml-1", isDark ? "text-text-secondaryDark" : "text-text-primaryLight")}>
                            Şifre
                        </Text>
                        <Controller
                            control={control}
                            name="password"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <View style={{ position: "relative" }}>
                                    <TextInput
                                        className={clsx(
                                            "w-full h-14 rounded-xl border px-4 pr-12 text-base",
                                            isDark ? "bg-background-cardDark border-border-dark text-text-primaryDark" : "bg-white border-gray-200 text-text-primaryLight",
                                            errors.password && "border-red-500"
                                        )}
                                        placeholder="••••••••"
                                        placeholderTextColor={isDark ? "#8FA6A0" : "#6B7F78"}
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoComplete="password"
                                        editable={!isLoading}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={{ position: "absolute", right: 16, top: "50%", marginTop: -10 }}
                                    >
                                        <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={20} color={isDark ? "#8FA6A0" : "#6B7F78"} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                        {errors.password && <Text className="text-red-500 text-sm ml-1">{errors.password.message}</Text>}
                    </View>

                    {/* Kayıt Ol */}
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
