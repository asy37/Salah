import React from "react";
import { View } from "react-native";
import Button from "@/components/button/Button";
import ModalComponent from "@/components/modal/ModalComponent";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DuaFormData, duaSchema } from "./schema";
import DuaForm from "./DuaForm";

export default function FloatingActionButton() {
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DuaFormData>({
    resolver: zodResolver(duaSchema),
    defaultValues: {
      title: "",
      text: "",
    },
  });
  const onSubmit = async (data: DuaFormData) => {
    console.log(data);
    await handleSubmit(onSubmit)();
  };
  return (
    <View className="absolute bottom-6 right-6 z-50">
      <Button onPress={() => setIsModalVisible(true)} leftIcon="add" size="large" backgroundColor="primary" />
      <ModalComponent visible={isModalVisible} onClose={() => setIsModalVisible(false)} title="Add Dua" >
        <DuaForm control={control} />
        <Button onPress={handleSubmit(onSubmit)} text="Add" leftIcon="add" backgroundColor="primary" size="medium" />
      </ModalComponent>
    </View>
  );
}

