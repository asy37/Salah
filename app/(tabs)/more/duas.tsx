import React from "react";
import { ScrollView, View, ActivityIndicator } from "react-native";
import clsx from "clsx";
import DuasHeader from "@/components/duas/DuasHeader";
import DuasList from "@/components/duas/DuasList";
import FloatingActionButton from "@/components/duas/FloatingActionButton";
import { useDuas } from "@/lib/hooks/duas/useDuas";
import SelectButton from "@/components/button/SelectButton";
import { FILTERS } from "@/components/duas/utils/utils";
import { useTheme } from "@/lib/storage/useThemeStore";

export default function DuasScreen() {
  const { isDark } = useTheme();
  const [selectedFilter, setSelectedFilter] = React.useState<"all" | "favorites">("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const { duas, isLoading, createDua, updateDua, deleteDua, toggleFavorite, isSaving } = useDuas();

  // Convert Dua to display format and filter
  const filteredDuas = React.useMemo(() => {
    const result = duas
      .map((dua) => ({
        id: dua.id,
        title: dua.title,
        text: dua.text,
        isFavorite: dua.is_favorite,
        date: new Date(dua.created_at).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      }))
      .filter((dua) => {
        if (selectedFilter === "all") return true;
        if (selectedFilter === "favorites") return dua.isFavorite;
        return true;
      })
      .filter((dua) => {
        if (searchQuery === "") return true;
        return dua.title.toLowerCase().includes(searchQuery.toLowerCase());
      });
    return result;
  }, [duas, selectedFilter, searchQuery]);

  return (
    <View
      className={clsx(
        "flex-1",
        isDark ? "bg-background-dark" : "bg-background-light"
      )}
    >
      <DuasHeader setSearchQuery={setSearchQuery} />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1F8F5F" />
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            <SelectButton
              buttonData={FILTERS}
              selectedFilter={selectedFilter}
              onPress={setSelectedFilter}
            />
            <View className="flex-1 flex-col p-4 gap-4">
              <DuasList duas={filteredDuas} updateDua={updateDua} deleteDua={deleteDua} toggleFavorite={toggleFavorite} isSaving={isSaving} />
            </View>
          </ScrollView>
          <FloatingActionButton createDua={createDua} isSaving={isSaving} />
        </>
      )}
    </View>
  );
}

