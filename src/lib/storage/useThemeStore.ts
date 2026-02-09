/**
 * Theme Store & Hook
 * Tüm proje için merkezi tema yönetimi.
 * - useThemeStore: Tercih kaydetme, Appearance.setColorScheme uygulama
 * - useTheme: colorScheme, isDark - tüm bileşenlerde kullanılacak tek kaynak
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance, useColorScheme } from "react-native";

export type ThemeOption = "light" | "dark" | "system";

type ThemeState = {
  theme: ThemeOption;
  setTheme: (theme: ThemeOption) => void;
  applyTheme: () => void;
};

function applyThemeToApp(theme: ThemeOption) {
  Appearance.setColorScheme(theme === "system" ? null : theme);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "system",

      setTheme: (theme) => {
        set({ theme });
        applyThemeToApp(theme);
      },

      applyTheme: () => {
        applyThemeToApp(get().theme);
      },
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyThemeToApp(state.theme);
        }
      },
    }
  )
);

/**
 * Merkezi tema hook'u - tüm bileşenlerde useColorScheme yerine kullanın.
 * useThemeStore + Appearance.setColorScheme ile senkron çalışır.
 */
export function useTheme() {
  const colorScheme = useColorScheme();
  const theme = useThemeStore((s) => s.theme);
  const isDark = colorScheme === "dark";
  return { colorScheme: colorScheme ?? "light", isDark, theme };
}
