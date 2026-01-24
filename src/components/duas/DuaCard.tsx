import { MaterialIcons } from "@expo/vector-icons";
import { Alert, Text, View } from "react-native";
import React from "react";
import clsx from "clsx";
import Button from "@/components/button/Button";
import { DuaFormData, duaSchema } from "./schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import DuaCardModal from "@/components/duas/DuaCardModal";
import { DuaType } from "@/components/duas/types/types";


type DuaCardProps = {
  readonly dua: DuaType;
  readonly isDark: boolean;
  readonly updateDua: (duaId: string, updates: { title?: string; text?: string; is_favorite?: boolean }) => Promise<void>;
  readonly deleteDua: (duaId: string) => Promise<void>;
  readonly toggleFavorite: (duaId: string) => Promise<void>;
  readonly isSaving: boolean;
};

export default function DuaCard({ dua, isDark, updateDua, deleteDua, toggleFavorite, isSaving }: DuaCardProps) {
  const [isMore, setIsMore] = React.useState(false);
  const [isFavorite, setIsFavorite] = React.useState(false);



  const handleToggleFavorite = () => {
    toggleFavorite(dua.id).catch((error) => {
      Alert.alert("Error", "Failed to update favorite. Please try again.");
      console.error("Error toggling favorite:", error);
    });
    setIsFavorite(!isFavorite);
  };



  const {
    control,
    handleSubmit,
  } = useForm<DuaFormData>({
    resolver: zodResolver(duaSchema),
    defaultValues: {
      title: dua.title ?? "",
      text: dua.text ?? "",
    },
  });
  return (
    <>
      <View
        className={clsx(
          "flex-col gap-3 rounded-2xl p-5 border",
          isDark
            ? "bg-background-cardDark border-border-dark/50"
            : "bg-background-cardLight border-gray-100"
        )}
      >
        {/* Header */}
        <View className="flex-row justify-between items-start w-full">
          <View>
            <Text className={clsx(
              "text-2xl font-bold",
              isDark ? "text-text-primaryDark" : "text-text-primaryLight"
            )}>{dua.title}</Text>
            <View className="flex-row items-center gap-2">
              <MaterialIcons
                name="calendar-today"
                size={16}
                color={isDark ? "#8FA6A0" : "#6B7F78"}
              />
              <Text
                className={clsx(
                  "text-xs font-medium",
                  isDark ? "text-text-secondaryDark" : "text-text-secondaryLight"
                )}
              >
                {dua.date}
              </Text>
            </View>
          </View>
          <View className="flex-row">
            <Button
              backgroundColor="transparent"
              size="small"
              className="p-2 -mr-2 rounded-full"
              onPress={() => handleToggleFavorite()}
              leftIcon={dua.isFavorite ? "favorite" : "favorite-border"}
              isIconActive={dua.isFavorite ?? isFavorite}
              disabled={isSaving}
            />
            <Button
              backgroundColor="transparent"
              className="p-2 -mr-2 rounded-full"
              size="small"
              onPress={() => setIsMore(true)}
              leftIcon='more-vert'
            />
          </View>
        </View>

        <Text
          className={clsx(
            "text-base font-normal leading-relaxed",
            isDark ? "text-text-primaryDark" : "text-text-primaryLight",
          )}
          numberOfLines={2}
        >
          {dua.text}
        </Text>
      </View>
      <DuaCardModal
        control={control}
        handleSubmit={handleSubmit}
        dua={dua}
        isMore={isMore}
        updateDua={updateDua}
        deleteDua={deleteDua}
        isSaving={isSaving}
        setIsMore={setIsMore}
      />
    </>
  );
}

