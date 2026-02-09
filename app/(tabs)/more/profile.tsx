import { View } from "react-native";
import clsx from "clsx";
import ProfileForm from "@/components/profile/ProfileForm/ProfileForm";
import { useTheme } from "@/lib/storage/useThemeStore";

export default function ProfileScreen() {
  const { isDark } = useTheme();

  return (
    <View
      className={clsx(
        "flex-1 items-center justify-center p-4 w-full",
        isDark ? "bg-background-dark" : "bg-background-light"
      )}
    >
      <ProfileForm />
    </View>
  );
}

