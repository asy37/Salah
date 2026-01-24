import { Text, TouchableOpacity, useColorScheme, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React from "react";
import clsx from "clsx";
import DhikrCounter from "@/components/dhikr/DhikrCounter";
import DhikrBottomBar from "@/components/dhikr/DhikrBottomBar";
import type { Dhikr } from "@/types/dhikir";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "@/components/theme/colors";
import Button from "@/components/button/Button";
import DhikrAdd from "@/components/dhikr/DhikrAdd";
import { useDhikr } from "@/lib/hooks/dhikir/useDhikr";
import { useDhikrSync } from "@/lib/hooks/dhikir/useDhikrSync";
import { dhikrRepo } from "@/lib/database/sqlite/dhikr/repository";
import { useAuth } from "@/lib/hooks/auth/useAuth";
import { getDb } from "@/lib/database/sqlite/db";
import DhikrHeader from "@/components/dhikr/DhikrHeader";

export default function DhikrScreen() {
  const colorScheme = useColorScheme();

  const isDark = colorScheme === "dark";
  const { user } = useAuth();
  const userId = user?.id || null;

  const [openAddDhikrModal, setOpenAddDhikrModal] = React.useState(false);
  const [currentSlug, setCurrentSlug] = React.useState<string | null>(null);
  const [isLoadingDhikrs, setIsLoadingDhikrs] = React.useState(true);

  // Initialize database and load available dhikrs
  React.useEffect(() => {
    const initialize = async () => {
      try {
        // Ensure database is initialized
        await getDb();

        // Load all dhikrs for current user
        if (userId) {
          const records = await dhikrRepo.getAllDhikrs(userId);

          // Set first dhikr as current if none selected
          if (!currentSlug && records.length > 0) {
            setCurrentSlug(records[0].slug);
          }
        }
      } catch (error) {
        console.error('[DhikrScreen] Error loading dhikrs:', error);
      } finally {
        setIsLoadingDhikrs(false);
      }
    };

    initialize();
  }, [userId, currentSlug]);

  // Use dhikr hook for current selected dhikr
  const { dhikr: currentDhikr, isLoading: isLoadingDhikr, increment, reset } = useDhikr(currentSlug);

  // Enable auto-sync
  useDhikrSync();

  const targetReached = currentDhikr ? currentDhikr.current_count >= currentDhikr.target_count : false;

  const handleIncrement = React.useCallback(() => {
    increment();
  }, [increment]);

  const handleReset = React.useCallback(() => {
    reset();
  }, [reset]);

  const handleSelectDhikr = React.useCallback((dhikr: Dhikr) => {
    setCurrentSlug(dhikr.slug);
  }, []);

  const handleDhikrAdded = React.useCallback(async (newDhikr: Dhikr) => {
    // Set new dhikr as current
    setCurrentSlug(newDhikr.slug);
    // Modal is already closed by DhikrAdd component
  }, []);

  return (
    <SafeAreaView
      className={clsx(
        "flex-1",
        isDark ? "bg-background-dark" : "bg-background-light"
      )}
      edges={["top"]}
    >
      <DhikrHeader isDark={isDark} setOpenAddDhikrModal={setOpenAddDhikrModal} />
      {(() => {
        if (isLoadingDhikrs || isLoadingDhikr) {
          return (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#1F8F5F" />
            </View>
          );
        }

        if (currentDhikr) {
          return (
            <>
              <Text className="text-2xl font-bold text-center">
                {currentDhikr.label || "Dhikr"}
              </Text>
              <View className="relative flex-1">
                <TouchableOpacity
                  className="flex-1 flex-col items-center justify-center"
                  onPress={handleIncrement}
                >
                  {targetReached && (
                    <View className="absolute top-10 items-center justify-center">
                      <MaterialIcons name="check-circle" size={24} color={colors.success} />
                      <Text className="text-lg font-bold text-center text-success">Target Reached</Text>
                    </View>
                  )}
                  <DhikrCounter
                    count={currentDhikr.current_count}
                    dhikrName={currentDhikr.label}
                    target={currentDhikr.target_count}
                    isDark={isDark}
                  />
                </TouchableOpacity>
              </View>
            </>
          );
        }

        return (
          <View className="flex-1 items-center justify-center">
            <Text className="text-2xl font-bold text-center">
              Select or add a Dhikr
            </Text>
          </View>
        );
      })()}
      <DhikrBottomBar
        setCurrentDhikr={handleSelectDhikr}
        currentDhikr={currentDhikr}
        onReset={handleReset}
        isDark={isDark}
      />
      <DhikrAdd
        openAddDhikrModal={openAddDhikrModal}
        setOpenAddDhikrModal={setOpenAddDhikrModal}
        onDhikrAdded={handleDhikrAdded}
      />
    </SafeAreaView>
  );
}

