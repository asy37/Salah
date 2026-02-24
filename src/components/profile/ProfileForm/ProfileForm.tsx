import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import clsx from "clsx";
import {
    Alert,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ProfileFormData, profileSchema } from "./schema";
import AvatarPicker from "@/components/form/AvatarPicker";
import FormField from "@/components/form/FormField";
import { useAuth } from "@/lib/hooks/auth/useAuth";
import { supabase } from "@/lib/supabase/client";
import {
    useUpgradeAnonymousUser,
    useUploadAvatar,
    useUpdateUserProfile,
    useUserProfile,
} from "@/lib/hooks/profile/useUserProfile";
import { getAvatarSignedUrl, getMyProfile } from "@/lib/api/services/profile";
import { useTheme } from "@/lib/storage/useThemeStore";
import { profileRepo } from "@/lib/database/sqlite/profile/repository";
import { queryClient } from "@/lib/query/queryClient";
import { queryKeys } from "@/lib/query/queryKeys";
import NetInfo from "@react-native-community/netinfo";

export default function ProfileForm() {
    const { isDark } = useTheme();
    const { user, isLoading: authLoading, isAnonymous } = useAuth();
    const { data: profile, isLoading: profileLoading, error: profileError } = useUserProfile();
    const updateProfileMutation = useUpdateUserProfile();
    const uploadAvatarMutation = useUploadAvatar();
    const upgradeAnonymousMutation = useUpgradeAnonymousUser();

    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [avatarDirty, setAvatarDirty] = useState(false);
    const [existingAvatarPath, setExistingAvatarPath] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: "",
            surname: "",
            email: "",
            password: "",
        },
    });

    const isBusy =
        authLoading ||
        profileLoading ||
        updateProfileMutation.isPending ||
        uploadAvatarMutation.isPending ||
        upgradeAnonymousMutation.isPending;

    const currentEmail = user?.email ?? "";

    useEffect(() => {
        // Initialize form fields when profile/auth is ready
        if (!user || !profile) return;
        reset({
            name: profile.name ?? "",
            surname: profile.surname ?? "",
            email: currentEmail,
            password: "",
        });
    }, [user, profile, reset, currentEmail]);

    useEffect(() => {
        // Load avatar preview from stored path (signed URL)
        const path = profile?.image ?? null;
        setExistingAvatarPath(path);
        setAvatarDirty(false);

        let cancelled = false;
        async function loadAvatar() {
            if (!path) {
                setAvatarUri(null);
                return;
            }
            try {
                const url = await getAvatarSignedUrl(path);
                if (!cancelled) setAvatarUri(url);
            } catch {
                if (!cancelled) setAvatarUri(null);
            }
        }
        loadAvatar();

        return () => {
            cancelled = true;
        };
    }, [profile?.image]);

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
            setAvatarUri(result.assets[0].uri);
            setAvatarDirty(true);
        }
    };

    const uploadAvatarIfNeeded = async (): Promise<string | null> => {
        if (!avatarDirty || !avatarUri) return existingAvatarPath;
        const uploaded = await uploadAvatarMutation.mutateAsync(avatarUri);
        return uploaded.path;
    };

    const updateAuthCredentialsIfNeeded = async (email: string, password: string) => {
        if (email && email !== currentEmail) {
            const { error } = await supabase.auth.updateUser({ email });
            if (error) throw new Error(error.message);
        }
        if (password) {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw new Error(error.message);
        }
    };

    const checkOnline = async (): Promise<boolean> => {
        const state = await NetInfo.fetch();
        return Boolean(state.isConnected && state.isInternetReachable);
    };

    const onSubmit = async (data: ProfileFormData) => {
        try {
            if (!user) {
                Alert.alert("Hata", "Oturum bulunamadı. Lütfen tekrar giriş yapın.");
                return;
            }

            const email = (data.email ?? "").trim();
            const password = (data.password ?? "").trim();
            const name = (data.name ?? "").trim();
            const surname = (data.surname ?? "").trim();
            const isOnline = await checkOnline();

            if (isAnonymous) {
                if (!isOnline) {
                    Alert.alert("İnternet gerekli", "Hesabı yükseltmek için internet bağlantısı gerekir.");
                    return;
                }
                if (!email) {
                    Alert.alert("Eksik bilgi", "Lütfen email adresinizi girin.");
                    return;
                }
                if (!password) {
                    Alert.alert("Eksik bilgi", "Lütfen şifrenizi girin.");
                    return;
                }

                const imagePath = await uploadAvatarIfNeeded();
                await upgradeAnonymousMutation.mutateAsync({
                    email,
                    password,
                    name: name || null,
                    surname: surname || null,
                    image: imagePath || null,
                });

                const updatedProfile = await getMyProfile();
                await profileRepo.upsertLocalProfile(user.id, updatedProfile);
                queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });

                Alert.alert("Başarılı", "Hesabın yükseltildi ve profilin güncellendi.");
                return;
            }

            if (isOnline) {
                try {
                    await updateAuthCredentialsIfNeeded(email, password);
                } catch (e) {
                    Alert.alert(
                        "Hata",
                        e instanceof Error ? e.message : "Email/şifre güncellenemedi."
                    );
                    return;
                }

                const imagePath = await uploadAvatarIfNeeded();
                await updateProfileMutation.mutateAsync({
                    name: name || null,
                    surname: surname || null,
                    image: imagePath || null,
                });

                Alert.alert("Başarılı", "Profilin güncellendi.");
            } else {
                const now = Date.now();
                const mergedProfile = {
                    id: user.id,
                    name: name || null,
                    surname: surname || null,
                    image: profile?.image ?? null,
                    is_anonymous: profile?.is_anonymous ?? false,
                    created_at: profile?.created_at ?? now,
                    updated_at: now,
                };
                await profileRepo.upsertLocalProfile(user.id, mergedProfile);
                await profileRepo.addToProfileSyncQueue(user.id, {
                    name: name || null,
                    surname: surname || null,
                    image: profile?.image ?? null,
                });
                queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
                Alert.alert("Kaydedildi", "Profiliniz çevrimdışı kaydedildi. İnternet bağlantısı kurulduğunda senkronize edilecek.");
            }
        } catch (e) {
            Alert.alert("Hata", e instanceof Error ? e.message : "Profil güncellenirken bir hata oluştu");
        }
    };

    const passwordRightIcon = (
        <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2"
        >
            <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={20} color={isDark ? "#8FA6A0" : "#6B7F78"} />
        </TouchableOpacity>
    );

    const submitLabel = useMemo(() => {
        if (isBusy) return "Kaydediliyor...";
        return isAnonymous ? "Hesabı Yükselt" : "Kaydet";
    }, [isBusy, isAnonymous]);

    return (
        <ScrollView className="flex-1 px-6 w-full" contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            <View className="px-6 pt-4 w-full">
                <AvatarPicker avatar={avatarUri} onPickImage={pickImage} />

                <View className="w-full flex-1 ">
                    <FormField
                        label="Ad (isteğe bağlı)"
                        name="name"
                        control={control}
                        placeholder="Adınız"
                        isLoading={isBusy}
                        autoCapitalize="words"
                    />

                    <FormField
                        label="Soyad (isteğe bağlı)"
                        name="surname"
                        control={control}
                        placeholder="Soyadınız"
                        isLoading={isBusy}
                        autoCapitalize="words"
                    />

                    <FormField
                        label={isAnonymous ? "Email Adresi (hesap açmak için)" : "Email Adresi"}
                        name="email"
                        control={control}
                        placeholder="ornek@email.com"
                        error={errors.email?.message}
                        isLoading={isBusy}
                        keyboardType="email-address"
                        autoComplete="email"
                        rightIcon={<MaterialIcons name="mail" size={20} color={isDark ? "#8FA6A0" : "#6B7F78"} />}
                    />

                    <FormField
                        label={isAnonymous ? "Şifre (hesap açmak için)" : "Yeni Şifre (isteğe bağlı)"}
                        name="password"
                        control={control}
                        placeholder="••••••••"
                        error={errors.password?.message}
                        isLoading={isBusy}
                        autoComplete="password"
                        secureTextEntry={!showPassword}
                        rightIcon={passwordRightIcon}
                    />

                    <TouchableOpacity
                        onPress={handleSubmit(onSubmit)}
                        disabled={isBusy}
                        className={clsx("mt-4 h-14 rounded-xl items-center justify-center shadow-sm", isBusy ? "bg-primary-400" : "bg-primary-500")}
                    >
                        <Text className="text-white text-base font-bold">{submitLabel}</Text>
                    </TouchableOpacity>

                    {!!profileError && (
                        <Text className="text-red-500 text-sm mt-3">
                            Profil yüklenemedi. Lütfen tekrar deneyin.
                        </Text>
                    )}
                </View>
            </View>
        </ScrollView>
    );
}
