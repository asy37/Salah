import { Text, View } from "react-native";
import { useEffect } from "react";
import clsx from "clsx";
import DuaCard from "./DuaCard";

type Dua = {
  id: string;
  date: string;
  text: string;
  title: string;
  isFavorite: boolean;
};

type DuasListProps = {
  readonly duas: readonly Dua[];
  readonly isDark: boolean;
  updateDua: (duaId: string, updates: { title?: string; text?: string; is_favorite?: boolean }) => Promise<void>;
  deleteDua: (duaId: string) => Promise<void>;
  toggleFavorite: (duaId: string) => Promise<void>;
  isSaving: boolean;
};

export default function DuasList({ duas, isDark, updateDua, deleteDua, toggleFavorite, isSaving }: DuasListProps) {
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/8bb95933-fbb3-484f-ab06-c34d89a637ef',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DuasList.tsx:25',message:'DuasList render',data:{duasCount:duas.length,duasIds:duas.map(d=>d.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  }, [duas]);
  // #endregion
  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between mt-2 mb-1 px-1">
        <Text
          className={clsx(
            "text-lg font-bold",
            isDark ? "text-text-primaryDark" : "text-text-primaryLight"
          )}
        >
          Your Prayers
        </Text>
        <View
          className={clsx(
            "px-2 py-1 rounded-md",
            isDark ? "bg-background-cardDark/50" : "bg-background-cardLight/50"
          )}
        >
          <Text
            className={clsx(
              "text-xs font-medium",
              isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
            )}
          >
            {duas.length} entries
          </Text>
        </View>
      </View>
      {duas.map((dua) => (
        <DuaCard key={dua.id} dua={dua} isDark={isDark} updateDua={updateDua} deleteDua={deleteDua} toggleFavorite={toggleFavorite} isSaving={isSaving} />
      ))}
    </View>
  );
}

