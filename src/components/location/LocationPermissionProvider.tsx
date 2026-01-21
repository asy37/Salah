/**
 * Location Permission Provider
 * Shows location permission modal on first app launch
 * Manages first-time user experience for location access
 */

import { useState, useEffect } from "react";
import * as Location from "expo-location";
import { useAuth } from "@/lib/hooks/auth/useAuth";
import { storage } from "@/lib/storage/mmkv";
import LocationPermissionModal from "@/components/adhan/LocationPermissionModal";
import { useLocationStore } from "@/lib/storage/locationStore";

const LOCATION_PERMISSION_ASKED_KEY = "location_permission_asked";
const LOCATION_PERMISSION_GRANTED_KEY = "location_permission_granted";
export default function LocationPermissionProvider() {
  const { session, user, isLoading: isAuthLoading } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const setLocation = useLocationStore((state) => state.setLocation);
  const location = useLocationStore((state) => state.location);

  // Helper function to fetch and set location
  const fetchAndSetLocation = async () => {
    try {
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
    } catch (error) {
      console.error(
        "[LocationPermissionProvider] Error fetching location:",
        error
      );
    }
  };

  useEffect(() => {
    // Wait for auth to finish loading and session to be available
    if (isAuthLoading) {
      return;
    }

    // Don't check if there's no user yet (user not logged in)
    // Allow both registered users (even if session is null due to email confirmation)
    // and anonymous users (they have a session)
    if (!user && !session) {
      setIsChecking(false);
      return;
    }

    const checkLocationPermission = async () => {
      try {
        setIsChecking(true);

        // Check if we've already asked for permission
        const hasAsked = await storage.getString(LOCATION_PERMISSION_ASKED_KEY);
        const hasGranted = await storage.getString(
          LOCATION_PERMISSION_GRANTED_KEY
        );

        // Check current permission status
        const { status } = await Location.getForegroundPermissionsAsync();

        // If permission is already granted, mark as asked and granted
        if (status === "granted") {
          await storage.set(LOCATION_PERMISSION_ASKED_KEY, "true");
          await storage.set(LOCATION_PERMISSION_GRANTED_KEY, "true");

          // If location is not set, fetch it automatically
          if (!location) {
            await fetchAndSetLocation();
          }

          setIsChecking(false);
          return;
        }

        // If already asked and granted (but permission might have been revoked), don't show modal
        if (hasAsked === "true" && hasGranted === "true") {
          setIsChecking(false);
          return;
        }

        // If permission is denied and we've asked before, don't show modal
        if (status === "denied" && hasAsked === "true") {
          setIsChecking(false);
          return;
        }

        // First time - show modal after a short delay
        // This works for both registered and anonymous users
        if (!hasAsked || hasAsked !== "true") {
          setTimeout(() => {
            setShowModal(true);
          }, 1500); // Show after 1.5 seconds to let app load
        }
      } catch (error) {
        console.error(
          "[LocationPermissionProvider] Error checking permission:",
          error
        );
      } finally {
        setIsChecking(false);
      }
    };

    checkLocationPermission();
  }, [session, isAuthLoading]); // Removed 'location' from dependencies to avoid unnecessary re-runs

  const handlePermissionGranted = async () => {
    try {
      // Mark as asked and granted
      await storage.set(LOCATION_PERMISSION_ASKED_KEY, "true");
      await storage.set(LOCATION_PERMISSION_GRANTED_KEY, "true");
    } catch (error) {
      console.error(
        "[LocationPermissionProvider] Error saving permission status:",
        error
      );
    }
  };

  const handleClose = async () => {
    // Mark as asked (user dismissed)
    await storage.set(LOCATION_PERMISSION_ASKED_KEY, "true");
    setShowModal(false);
  };

  // Don't show modal while checking or if auth is loading
  // But allow showing modal even if session is null (will be handled by useEffect)
  if (isChecking || isAuthLoading) {
    return null;
  }

  return (
    <LocationPermissionModal
      visible={showModal}
      onClose={handleClose}
      onPermissionGranted={handlePermissionGranted}
    />
  );
}
