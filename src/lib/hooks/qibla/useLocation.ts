/**
 * Location Hook
 * Handles location permissions and fetching user location
 * Writes resolved location into Zustand store (global source of truth)
 */

import { useState, useEffect } from "react";
import * as Location from "expo-location";
import { useLocationStore } from "@/lib/storage/locationStore";

export type LocationData = {
  readonly latitude: number;
  readonly longitude: number;
  readonly city?: string;
  readonly country?: string;
};

type LocationState = {
  readonly loading: boolean;
  readonly error: string | null;
  readonly permissionStatus: Location.PermissionStatus | null;
};

/**
 * Hook to get user location with permission handling
 * NOTE: This hook does NOT hold location state.
 * Location is stored globally in Zustand.
 */
export function useLocation() {
  const [state, setState] = useState<LocationState>({
    loading: false,
    error: null,
    permissionStatus: null,
  });

  const setLocation = useLocationStore((s) => s.setLocation);

  /**
   * Request location permission and get current location
   */
  const requestLocation = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Check existing permission
      const { status: existingStatus } =
        await Location.getForegroundPermissionsAsync();

      let finalStatus = existingStatus;

      // Request permission if needed
      if (existingStatus !== "granted") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      setState((prev) => ({
        ...prev,
        permissionStatus: finalStatus,
      }));

      if (finalStatus !== "granted") {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Location permission denied",
        }));
        return;
      }

      // Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode
      const [address] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      // Save location into global store
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        city: address?.city || address?.subregion || undefined,
        country: address?.country || undefined,
      });

      setState((prev) => ({
        ...prev,
        loading: false,
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error ? error.message : "Failed to get location",
      }));
    }
  };

  /**
   * Check current permission status
   */
  const checkPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setState((prev) => ({
        ...prev,
        permissionStatus: status,
      }));
      return status;
    } catch (error) {
      console.error("Error checking location permission:", error);
      return null;
    }
  };

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, []);

  return {
    loading: state.loading,
    error: state.error,
    permissionStatus: state.permissionStatus,
    requestLocation,
    checkPermission,
  };
}
