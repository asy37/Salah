import clsx from "clsx";

export const getTextInputClassName = (isDark: boolean, hasError?: boolean) =>
    clsx(
        "w-full h-14 rounded-xl border px-4 text-base",
        isDark ? "bg-background-cardDark border-border-dark text-text-primaryDark" : "bg-white border-gray-200 text-text-primaryLight",
        hasError && "border-red-500"
    );

export const getLabelClassName = (isDark: boolean) =>
    clsx("text-sm font-medium ml-1", isDark ? "text-text-secondaryDark" : "text-text-primaryLight");
