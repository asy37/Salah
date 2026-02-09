import { View, Text, TouchableOpacity, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import clsx from "clsx";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/auth/useAuth";
import { resendConfirmationEmail } from "@/lib/api/services/auth";
import { useTheme } from "@/lib/storage/useThemeStore";

export default function RegistrationConfirmationScreen() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);

  // Check if email is confirmed and redirect
  useEffect(() => {
    if (user && user.email_confirmed_at) {
      // Email confirmed, navigate to app
      router.replace("/(tabs)");
    }
  }, [user]);

  const handleResendEmail = async () => {
    if (!user?.email) {
      Alert.alert("Hata", "Email adresi bulunamadı");
      return;
    }

    setIsResending(true);
    try {
      const { error } = await resendConfirmationEmail(user.email);

      if (error) {
        Alert.alert("Hata", error.message);
      } else {
        Alert.alert("Başarılı", "Onay maili tekrar gönderildi. Lütfen mail kutunuzu kontrol edin.");
      }
    } catch (error) {
      Alert.alert("Hata", "Mail gönderilirken bir hata oluştu");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View
      className={clsx(
        "flex-1 items-center justify-center px-6 py-12",
        isDark ? "bg-background-dark" : "bg-background-light"
      )}
    >
      {/* Hero Icon Component */}
      <View className="mb-10" style={{ position: "relative" }}>
        {/* Icon Background */}
        <View
          className={clsx(
            "w-32 h-32 rounded-full items-center justify-center shadow-sm",
            isDark ? "bg-background-cardDark" : "bg-white"
          )}
        >
          {/* Mail Icon */}
          <MaterialIcons name="mail" size={64} color="#1F8F5F" />
        </View>
        {/* Checkmark Badge */}
        <View
          className={clsx(
            "rounded-full p-1.5",
            isDark ? "bg-background-dark" : "bg-background-light"
          )}
          style={{ position: "absolute", bottom: -4, right: -4 }}
        >
          <View className="bg-primary-500 shadow-lg rounded-full w-10 h-10 items-center justify-center">
            <MaterialIcons name="check" size={24} color="white" />
          </View>
        </View>
      </View>

      {/* Text Content Stack */}
      <View className="items-center mb-8" style={{ gap: 16 }}>
        {/* Headline */}
        <Text
          className={clsx(
            "text-[32px] font-bold leading-tight text-center",
            isDark ? "text-text-primaryDark" : "text-text-primaryLight"
          )}
        >
          Mailini kontrol et
        </Text>
        {/* Body Text */}
        <Text
          className={clsx(
            "text-base font-normal leading-relaxed text-center max-w-[280px]",
            isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
          )}
        >
          Hesabını aktifleştirmek için {user?.email ? `${user.email} adresine` : "mailine"} bir onay linki gönderdik.
        </Text>
        {/* Helper/Meta Text */}
        <View className="pt-2">
          <Text
            className={clsx(
              "text-sm font-medium leading-normal text-center px-4",
              isDark ? "text-primary-400" : "text-primary-500"
            )}
          >
            Mail gelmezse spam klasörünü kontrol etmeyi unutma.
          </Text>
        </View>
      </View>

      {/* Action Area */}
      <View className="w-full items-center justify-center mt-4" style={{ gap: 16 }}>
        {/* Secondary Button */}
        <TouchableOpacity
          onPress={handleResendEmail}
          disabled={isResending}
          className={clsx(
            "h-12 px-6 rounded-xl items-center justify-center flex-row",
            isDark ? "bg-primary-500/10" : "bg-primary-50",
            isResending && "opacity-50"
          )}
          style={{ minWidth: 84, maxWidth: 480, gap: 8 }}
        >
          <MaterialIcons name="send" size={20} color="#1F8F5F" />
          <Text className="text-primary-500 text-sm font-bold">
            {isResending ? "Gönderiliyor..." : "Maili tekrar gönder"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer Link */}
      <View style={{ position: "absolute", bottom: 24, alignItems: "center" }}>
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center py-2 px-4 rounded-lg"
          style={{ gap: 6 }}
        >
          <MaterialIcons
            name="arrow-back"
            size={18}
            color={isDark ? "#8FA6A0" : "#6B7F78"}
          />
          <Text
            className={clsx(
              "text-sm font-semibold",
              isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
            )}
          >
            Giriş sayfasına dön
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

