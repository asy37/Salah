import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type UserLocation = {
  city: string | undefined;
  country: string | undefined;
  latitude: number;
  longitude: number;
};

type LocationState = {
  location: UserLocation | null;
  autoLocation: boolean;

  setLocation: (location: UserLocation) => void;
  clearLocation: () => void;
  setAutoLocation: (enabled: boolean) => void;
};

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      location: null,
      autoLocation: true,

      setLocation: (location) =>
        set({
          location,
        }),

      clearLocation: () =>
        set({
          location: null,
        }),

      setAutoLocation: (enabled) =>
        set({
          autoLocation: enabled,
        }),
    }),
    {
      name: "location-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
