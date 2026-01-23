import { ScrollView, useColorScheme, View, ActivityIndicator } from "react-native";
import { useState, useEffect, useMemo } from "react";
import clsx from "clsx";
import DuasHeader from "@/components/duas/DuasHeader";
import FilterTabs from "@/components/duas/FilterTabs";
import DuasList from "@/components/duas/DuasList";
import FloatingActionButton from "@/components/duas/FloatingActionButton";
import { useDuas } from "@/lib/hooks/duas/useDuas";

export default function DuasScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [selectedFilter, setSelectedFilter] = useState<"all" | "favorites">("all");
  const { duas, isLoading, createDua, updateDua, deleteDua, toggleFavorite, isSaving } = useDuas();

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'duas.tsx:15',message:'DuasScreen render',data:{duasCount:duas.length,duasIds:duas.map(d=>d.id),isLoading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  }, [duas, isLoading]);
  // #endregion

  // Convert Dua to display format and filter
  const filteredDuas = useMemo(() => {
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
      });
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'duas.tsx:32',message:'filteredDuas computed',data:{filteredCount:result.length,filteredIds:result.map(d=>d.id),duasCount:duas.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return result;
  }, [duas, selectedFilter]);

  return (
    <View
      className={clsx(
        "flex-1",
        isDark ? "bg-background-dark" : "bg-background-light"
      )}
    >
      <DuasHeader isDark={isDark} />
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
            <FilterTabs
              selectedFilter={selectedFilter}
              setSelectedFilter={setSelectedFilter}
              isDark={isDark}
            />
            <View className="flex-1 flex-col p-4 gap-4">
              <DuasList duas={filteredDuas} isDark={isDark} updateDua={updateDua} deleteDua={deleteDua} toggleFavorite={toggleFavorite} isSaving={isSaving} />
            </View>
          </ScrollView>
          <FloatingActionButton createDua={createDua} isSaving={isSaving} />
        </>
      )}
    </View>
  );
}

