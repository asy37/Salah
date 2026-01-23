import { colors } from "@/components/theme/colors";

export const getIconColor = (active: boolean, isDark: boolean, color: 'white' | 'transparent' | 'primary') => {
    if (active) {
        return isDark ? colors.text.white : colors.primary[500];
    }
    return {
        white: isDark ? colors.text.muted : colors.text.white,
        transparent: isDark ? colors.text.muted : colors.text.primaryLight,
        primary: isDark ? colors.text.muted : colors.text.white,
    }[color];
};

export const sizeClass = (size: "small" | "medium" | "large") => {
    return {
        large: "w-full p-4",
        medium: "min-w-fit px-4 py-3",
        small: "px-3 py-2",
    }[size]
};

export const textColorClass = (backgroundColor: "white" | "transparent" | "primary", isDark: boolean) => {
    return {
        white: isDark ? colors.success : "text-success",
        transparent: isDark ? colors.text.secondaryDark : "text-text-primaryLight",
        primary: "text-white",
    }[backgroundColor];
};


export const backgroundColorClass = (backgroundColor: "white" | "transparent" | "primary", isDark: boolean) => {
    return {
        white: isDark ? "bg-background-cardDark" : "bg-background-cardLight",
        transparent: "bg-transparent",
        primary: isDark ? "bg-primary-500/20" : "bg-primary-500",
    }[backgroundColor];
};

