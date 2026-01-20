import {
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import clsx from "clsx";
import RegisterForm from "@/components/auth/register/RegisterForm";



export default function RegisterScreen() {
  const isDark = useColorScheme() === "dark";


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className={clsx("flex-1", isDark ? "bg-background-dark" : "bg-background-light")}
    >
      <RegisterForm />
    </KeyboardAvoidingView>
  );
}