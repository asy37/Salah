import { Alert, Text, useColorScheme, View } from "react-native";
import ModalComponent from "@/components/modal/ModalComponent";
import Button from "@/components/button/Button";
import DuaForm from "@/components/duas/DuaForm";
import { DuaFormData } from "@/components/duas/schema";
import React from "react";
import { Control, UseFormHandleSubmit } from "react-hook-form";
import clsx from "clsx";
import * as Clipboard from "expo-clipboard";
import { DuaType } from "@/components/duas/types/types";


type DuaCardModalProps = {
    readonly dua: DuaType;
    readonly updateDua: (duaId: string, updates: { title?: string; text?: string; is_favorite?: boolean }) => Promise<void>;
    readonly deleteDua: (duaId: string) => Promise<void>;
    readonly isSaving: boolean;
    readonly isMore: boolean;
    readonly setIsMore: (isMore: boolean) => void
    readonly control: Control<DuaFormData>
    readonly handleSubmit: UseFormHandleSubmit<DuaFormData>
};
export default function DuaCardModal({ control, handleSubmit, dua, isMore, updateDua, deleteDua, isSaving, setIsMore }: DuaCardModalProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const [isEdit, setIsEdit] = React.useState(false);

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

    const handleCopyDua = async () => {
        await Clipboard.setStringAsync(dua.text);
        Alert.alert("Kopyalandı", "Dua panoya kopyalandı 🤍");
    };

    return (
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
    );
}