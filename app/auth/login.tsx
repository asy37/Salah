import { useState } from "react";
import {
    ScrollView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import clsx from "clsx";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    signInWithPassword,
    signInAnonymously,
    resetPasswordForEmail,
} from "@/lib/api/services/auth";
import { loginSchema, type LoginFormValues } from "@/components/auth/login/schema";
import { useTheme } from "@/lib/storage/useThemeStore";
import { useTranslation } from "@/i18n";
import { i18n } from "@/i18n";

async function doSignIn(email: string, password: string) {
    const result = await signInWithPassword(email, password);
    if (result.error) {
        Alert.alert(i18n.t("auth.loginError"), result.error.message);
        return;
    }
    if (result.user || result.session) {
        setTimeout(() => router.replace("/(tabs)"), 500);
    } else {
        Alert.alert(i18n.t("auth.error"), i18n.t("auth.signInError"));
    }
}
function getValidEmail(raw?: string): string | null {
    const email = raw?.trim();
    if (!email) return null;

    const parsed = loginSchema.shape.email.safeParse(email);
    return parsed.success ? parsed.data : null;
}
async function sendResetPassword(email: string) {
    const { error } = await resetPasswordForEmail(email);

    if (error) {
        Alert.alert(i18n.t("auth.error"), error.message);
        return;
    }

    Alert.alert(
        i18n.t("auth.forgotPasswordSent"),
        i18n.t("auth.forgotPasswordMessage")
    );
}
async function doForgotPassword(getEmail: () => string) {
    const email = getValidEmail(getEmail());

    if (!email) {
        Alert.alert(
            i18n.t("auth.invalidEmail"),
            i18n.t("auth.invalidEmailMessage")
        );
        return;
    }

    await sendResetPassword(email);
}

async function doGuestSignIn() {
    const result = await signInAnonymously();
    if (result.error) {
        Alert.alert(i18n.t("auth.error"), result.error.message);
        return;
    }
    if (result.user || result.session) {
        setTimeout(() => router.replace("/(tabs)"), 500);
    } else {
        Alert.alert(i18n.t("auth.error"), i18n.t("auth.guestSignInError"));
    }
}

export default function LoginScreen() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { control, handleSubmit, getValues, formState: { errors } } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    });

    const onSubmit = async (data: LoginFormValues) => {
        setIsLoading(true);
        try {
            await doSignIn(data.email, data.password);
        } catch {
            Alert.alert(i18n.t("auth.error"), i18n.t("auth.signInError"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = () => doForgotPassword(() => getValues("email"));

    const handleGuestContinue = async () => {
        setIsLoading(true);
        try {
            await doGuestSignIn();
        } catch {
            Alert.alert(i18n.t("auth.error"), i18n.t("auth.guestSignInError"));
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className={clsx(
                "flex-1",
                isDark ? "bg-background-dark" : "bg-background-light"
            )}
        >
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View className="px-6 pt-4">

                    {/* Form */}
                    <View style={{ gap: 20 }}>
                        {/* Email */}
                        <View style={{ gap: 8 }}>
                            <Text
                                className={clsx(
                                    "text-sm font-medium ml-1",
                                    isDark ? "text-text-secondaryDark" : "text-text-primaryLight"
                                )}
                            >
                                {t("auth.email")}
                            </Text>
                            <Controller
                                control={control}
                                name="email"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <View style={{ position: "relative" }}>
                                        <TextInput
                                            className={clsx(
                                                "w-full h-14 rounded-xl border px-4 pr-12 text-base",
                                                isDark
                                                    ? "bg-background-cardDark border-border-dark text-text-primaryDark"
                                                    : "bg-white border-gray-200 text-text-primaryLight",
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
                                        <View
                                            style={{
                                                position: "absolute",
                                                right: 16,
                                                top: "50%",
                                                marginTop: -10,
                                            }}
                                        >
                                            <MaterialIcons
                                                name="mail"
                                                size={20}
                                                color={isDark ? "#8FA6A0" : "#6B7F78"}
                                            />
                                        </View>
                                    </View>
                                )}
                            />
                            {errors.email && (
                                <Text className="text-red-500 text-sm ml-1">{errors.email.message}</Text>
                            )}
                        </View>

                        {/* Password */}
                        <View style={{ gap: 8 }}>
                            <Text
                                className={clsx(
                                    "text-sm font-medium ml-1",
                                    isDark ? "text-text-secondaryDark" : "text-text-primaryLight"
                                )}
                            >
                                {t("auth.password")}
                            </Text>
                            <Controller
                                control={control}
                                name="password"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <View style={{ position: "relative" }}>
                                        <TextInput
                                            className={clsx(
                                                "w-full h-14 rounded-xl border px-4 pr-12 text-base",
                                                isDark
                                                    ? "bg-background-cardDark border-border-dark text-text-primaryDark"
                                                    : "bg-white border-gray-200 text-text-primaryLight",
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
                                            style={{
                                                position: "absolute",
                                                right: 16,
                                                top: "50%",
                                                marginTop: -10,
                                            }}
                                        >
                                            <MaterialIcons
                                                name={showPassword ? "visibility-off" : "visibility"}
                                                size={20}
                                                color={isDark ? "#8FA6A0" : "#6B7F78"}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            />
                            {errors.password && (
                                <Text className="text-red-500 text-sm ml-1">{errors.password.message}</Text>
                            )}
                        </View>

                        {/* Şifremi unuttum */}
                        <View className="items-end -mt-2">
                            <TouchableOpacity onPress={handleForgotPassword} disabled={isLoading}>
                                <Text
                                    className={clsx(
                                        "text-sm font-medium",
                                        isDark ? "text-primary-400" : "text-primary-500",
                                        isLoading && "opacity-50"
                                    )}
                                >
                                    Şifremi unuttum
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Giriş Yap */}
                        <TouchableOpacity
                            onPress={handleSubmit(onSubmit)}
                            disabled={isLoading}
                            className={clsx(
                                "mt-2 h-14 rounded-xl items-center justify-center shadow-sm",
                                isLoading ? "bg-primary-400" : "bg-primary-500"
                            )}
                        >
                            <Text className="text-white text-base font-bold">
                                {isLoading ? t("auth.signingIn") : t("auth.signIn")}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    <View className="flex-row items-center my-8" style={{ gap: 16 }}>
                        <View
                            className={clsx("flex-1 h-px", isDark ? "bg-border-dark" : "bg-gray-200")}
                        />
                        <Text
                            className={clsx(
                                "text-xs font-medium uppercase",
                                isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
                            )}
                        >
                            {t("auth.or")}
                        </Text>
                        <View
                            className={clsx("flex-1 h-px", isDark ? "bg-border-dark" : "bg-gray-200")}
                        />
                    </View>

                    {/* Misafir */}
                    <View className="items-center mb-6">
                        <TouchableOpacity onPress={handleGuestContinue} disabled={isLoading}>
                            <Text
                                className={clsx(
                                    "text-sm font-semibold",
                                    isDark ? "text-text-secondaryDark" : "text-text-secondaryLight",
                                    isLoading && "opacity-50"
                                )}
                            >
                                {t("auth.continueAsGuest")}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Kayıt ol */}
                    <View className="flex-row items-center justify-center" style={{ gap: 6 }}>
                        <Text
                            className={clsx(
                                "text-sm",
                                isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
                            )}
                        >
                            {t("auth.noAccount")}
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push("/auth/register")}
                            disabled={isLoading}
                        >
                            <Text
                                className={clsx(
                                    "text-sm font-bold",
                                    isDark ? "text-primary-400" : "text-primary-500",
                                    isLoading && "opacity-50"
                                )}
                            >
                                {t("auth.registerLink")}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
