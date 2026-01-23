import React from "react";
import { View, Alert } from "react-native";
import Button from "@/components/button/Button";
import ModalComponent from "@/components/modal/ModalComponent";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DuaFormData, duaSchema } from "./schema";
import DuaForm from "./DuaForm";
type FloatingActionButtonProps = {
  createDua: (title: string, text: string, isFavorite?: boolean) => Promise<void>;
  isSaving: boolean;
};

export default function FloatingActionButton({ createDua, isSaving }: FloatingActionButtonProps) {
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const {
    control,
    handleSubmit,
    reset,
  } = useForm<DuaFormData>({
    resolver: zodResolver(duaSchema),
    defaultValues: {
      title: "",
      text: "",
    },
  });

  const onSubmit = async (data: DuaFormData) => {
    console.log(data);
    try {
      await createDua(data.title, data.text, false);
      reset();
      setIsModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to create dua. Please try again.");
      console.error("Error creating dua:", error);
    }
  };
  return (
    <View className="absolute bottom-6 right-6 z-50">
      <Button onPress={() => setIsModalVisible(true)} leftIcon="add" size="large" backgroundColor="primary" />
      <ModalComponent visible={isModalVisible} onClose={() => setIsModalVisible(false)} title="Add Dua" isLoading={isSaving}>
        <DuaForm control={control} />
        <Button 
          onPress={handleSubmit(onSubmit)} 
          text="Add" 
          leftIcon="add" 
          backgroundColor="primary" 
          size="medium"
          disabled={isSaving}
        />
      </ModalComponent>
    </View>
  );
}

