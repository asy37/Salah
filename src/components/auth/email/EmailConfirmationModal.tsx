/**
 * Email Confirmation Reminder Modal
 * Shows a reminder to confirm email if user hasn't confirmed yet
 */

import { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import clsx from "clsx";
import { useAuth } from "@/lib/hooks/auth/useAuth";
import { resendConfirmationEmail } from "@/lib/api/services/auth";
import { useTheme } from "@/lib/storage/useThemeStore";

interface EmailConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function EmailConfirmationModal({
  visible,
  onClose,
}: EmailConfirmationModalProps) {
  const { isDark } = useTheme();
  const { user, isEmailConfirmed, isAnonymous } = useAuth();
  const [isResending, setIsResending] = useState(false);

  // Don't show for anonymous users or if email is already confirmed
  if (isAnonymous || isEmailConfirmed || !user?.email) {
    return null;
  }

  const handleResendEmail = async () => {
    if (!user?.email) return;

    setIsResending(true);
    try {
      const { error } = await resendConfirmationEmail(user.email);

      if (error) {
        Alert.alert("Hata", error.message);
      } else {
        Alert.alert(
          "Başarılı",
          "Onay maili tekrar gönderildi. Lütfen mail kutunuzu kontrol edin."
        );
      }
    } catch (error) {
      Alert.alert("Hata", "Mail gönderilirken bir hata oluştu");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View
          className={clsx(
            "w-full max-w-sm rounded-2xl p-6 shadow-lg",
            isDark ? "bg-background-cardDark" : "bg-white"
          )}
        >
          {/* Icon */}
          <View className="items-center mb-4">
            <View
              className={clsx(
                "w-16 h-16 rounded-full items-center justify-center",
                isDark ? "bg-primary-500/20" : "bg-primary-50"
              )}
            >
              <MaterialIcons name="mail-outline" size={32} color="#1F8F5F" />
            </View>
          </View>

          {/* Title */}
          <Text
            className={clsx(
              "text-xl font-bold text-center mb-2",
              isDark ? "text-text-primaryDark" : "text-text-primaryLight"
            )}
          >
            Email Adresinizi Onaylayın
          </Text>

          {/* Message */}
          <Text
            className={clsx(
              "text-sm text-center mb-6 leading-relaxed",
              isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
            )}
          >
            {user.email} adresine gönderdiğimiz onay linkine tıklayarak
            hesabınızı aktifleştirebilirsiniz.
          </Text>

          {/* Actions */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={handleResendEmail}
              disabled={isResending}
              className={clsx(
                "h-12 rounded-xl items-center justify-center flex-row gap-2",
                isDark ? "bg-primary-500" : "bg-primary-500",
                isResending && "opacity-50"
              )}
            >
              <MaterialIcons
                name="send"
                size={20}
                color="white"
              />
              <Text className="text-white text-base font-semibold">
                {isResending ? "Gönderiliyor..." : "Maili Tekrar Gönder"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              className={clsx(
                "h-12 rounded-xl items-center justify-center",
                isDark ? "bg-background-cardDark border border-border-dark" : "bg-gray-100"
              )}
            >
              <Text
                className={clsx(
                  "text-base font-medium",
                  isDark ? "text-text-secondaryDark" : "text-text-primaryLight"
                )}
              >
                Daha Sonra
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

