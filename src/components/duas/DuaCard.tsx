import { MaterialIcons } from "@expo/vector-icons";
import { Alert, Pressable, Text, View } from "react-native";
import React from "react";
import clsx from "clsx";
import Button from "../button/Button";
import ModalComponent from "../modal/ModalComponent";
import * as Clipboard from "expo-clipboard";
import DuaForm from "./DuaForm";
import { DuaFormData, duaSchema } from "./schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
type Dua = {
  id: string;
  date: string;
  text: string;
  title: string;
  isFavorite: boolean;
};

type DuaCardProps = {
  readonly dua: Dua;
  readonly isDark: boolean;
  updateDua: (duaId: string, updates: { title?: string; text?: string; is_favorite?: boolean }) => Promise<void>;
  deleteDua: (duaId: string) => Promise<void>;
  toggleFavorite: (duaId: string) => Promise<void>;
  isSaving: boolean;
};

export default function DuaCard({ dua, isDark, updateDua, deleteDua, toggleFavorite, isSaving }: DuaCardProps) {
  const [isMore, setIsMore] = React.useState(false);
  const [isEdit, setIsEdit] = React.useState(false);
  const [isFavorite, setIsFavorite] = React.useState(false);

  const handleEditDua = () => {
    setIsEdit(!isEdit);
  };

  const handleSaveEdit = async (data: DuaFormData) => {
    try {
      await updateDua(dua.id, {
        title: data.title.trim(),
        text: data.text.trim(),
      });
      setIsEdit(false);
      setIsMore(false);
      Alert.alert("Success", "Dua updated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to update dua. Please try again.");
      console.error("Error updating dua:", error);
    }
  };

  const handleDeleteDua = () => {
    Alert.alert(
      "Delete Dua",
      "Are you sure you want to delete this dua?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteDua(dua.id)
              .then(() => {
                setIsMore(false);
                Alert.alert("Success", "Dua deleted successfully");
              })
              .catch((error) => {
                Alert.alert("Error", "Failed to delete dua. Please try again.");
                console.error("Error deleting dua:", error);
              });
          },
        },
      ]
    );
  };

  const handleToggleFavorite = () => {
    toggleFavorite(dua.id).catch((error) => {
      Alert.alert("Error", "Failed to update favorite. Please try again.");
      console.error("Error toggling favorite:", error);
    });
    setIsFavorite(!isFavorite);
  };

  const handleCopyDua = async () => {
    await Clipboard.setStringAsync(dua.text);
    Alert.alert("Kopyalandı", "Dua panoya kopyalandı 🤍");
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
      <Pressable
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
      </Pressable>
      <ModalComponent
        visible={isMore}
        onClose={() => {
          setIsMore(false);
          setIsEdit(false);
        }}
        title={isEdit ? "Edit Dua" : dua.title}
        isLoading={isSaving}
      >
        {isEdit ? (
          <>
            <DuaForm control={control} />
            <View className="flex-row gap-2">
              <Button
                backgroundColor="transparent"
                size="small"
                onPress={() => {
                  setIsEdit(false);
                  control._reset();
                }}
                leftIcon="close"
                text="Cancel"
              />
              <Button
                backgroundColor="primary"
                size="small"
                onPress={handleSubmit(handleSaveEdit)}
                leftIcon="check"
                text="Save"
                disabled={isSaving}
              />
            </View>
          </>
        ) : (
          <>
            <View className="w-full mb-4">
              <Text
                className={clsx(
                  "text-base font-normal leading-relaxed mb-4",
                  isDark ? "text-text-primaryDark" : "text-text-primaryLight"
                )}
              >
                {dua.text}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <Button
                backgroundColor="transparent"
                size="small"
                onPress={handleCopyDua}
                leftIcon="content-copy"
                text="Copy"
              />
              <Button
                backgroundColor="transparent"
                size="small"
                onPress={handleEditDua}
                leftIcon="edit"
                text="Edit"
              />
              <Button
                backgroundColor="transparent"
                size="small"
                onPress={handleDeleteDua}
                leftIcon="delete"
                text="Delete"
              />
            </View>
          </>
        )}
      </ModalComponent>
    </>
  );
}

