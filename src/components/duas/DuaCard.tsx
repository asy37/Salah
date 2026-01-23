import { MaterialIcons } from "@expo/vector-icons";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
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
};

export default function DuaCard({ dua, isDark }: DuaCardProps) {
  const [isFavorite, setIsFavorite] = React.useState(dua.isFavorite);
  const [isMore, setIsMore] = React.useState(false);
  const [isEdit, setIsEdit] = React.useState(false);

  const handleEditDua = () => {
    setIsEdit(!isEdit);
  };
  const handleCopyDua = async () => {
    await Clipboard.setStringAsync(dua.text);
    Alert.alert("Kopyalandı", "Dua panoya kopyalandı 🤍");
  };
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DuaFormData>({
    resolver: zodResolver(duaSchema),
    defaultValues: {
      title: dua.title ?? "",
      text: dua.text ?? "",
    },
  });
  const onSubmit = async (data: DuaFormData) => {
    console.log(data);
    await handleSubmit(onSubmit)();
  };
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
              onPress={() => setIsFavorite(!isFavorite)}
              leftIcon={isFavorite ? "favorite" : "favorite-border"}
              isIconActive={isFavorite}
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
        onClose={() => setIsMore(false)}
        title={dua.title}
      >
        <DuaForm control={control} />
        <View className="flex-row gap-2">
          <Button
            backgroundColor="transparent"
            size="small"
            onPress={handleCopyDua}
            leftIcon='content-copy'
          />
          <Button
            backgroundColor="transparent"
            size="small"
            onPress={() => handleEditDua()}
            leftIcon={isEdit ? 'check' : 'edit'}
          />
        </View>
      </ModalComponent>
    </>
  );
}

