import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { Text, TextInput, useColorScheme, View } from "react-native";
import { getLabelClassName, getTextInputClassName } from "./utils";

// Form Field Component
type FormFieldProps<T extends FieldValues = FieldValues> = Readonly<{
    label: string;
    name: Path<T>;
    control: Control<T>;
    placeholder: string;
    error?: string;
    isLoading: boolean;
    autoCapitalize?: "none" | "words" | "sentences";
    keyboardType?: "default" | "email-address";
    autoComplete?: "email" | "password" | "off";
    secureTextEntry?: boolean;
    rightIcon?: React.ReactNode;
}>;

export default function FormField<T extends FieldValues = FieldValues>({
    label,
    name,
    control,
    placeholder,
    error,
    isLoading,
    autoCapitalize = "none",
    keyboardType = "default",
    autoComplete = "off",
    secureTextEntry = false,
    rightIcon,
}: Readonly<FormFieldProps<T>>) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    return (
        <View className="w-full" style={{ gap: 8 }}>
            <Text className={getLabelClassName(isDark)}>{label}</Text>
            <Controller
                control={control}
                name={name}
                render={({ field: { onChange, onBlur, value } }) => (
                    <View className="w-full relative">
                        <TextInput
                            className={getTextInputClassName(isDark, !!error)}
                            placeholder={placeholder}
                            placeholderTextColor={isDark ? "#8FA6A0" : "#6B7F78"}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            autoCapitalize={autoCapitalize}
                            keyboardType={keyboardType}
                            autoComplete={autoComplete}
                            secureTextEntry={secureTextEntry}
                            editable={!isLoading}
                        />
                        {rightIcon && (
                            <View className="absolute right-4 top-1/2 -translate-y-1/2">
                                {rightIcon}
                            </View>
                        )}
                    </View>
                )}
            />
            {error && <Text className="text-red-500 text-sm ml-1">{error}</Text>}
        </View>
    );
}