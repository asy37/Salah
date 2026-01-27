import { View, useColorScheme } from "react-native";
import clsx from "clsx";
import ProfileForm from "@/components/profile/ProfileForm/ProfileForm";

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

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

