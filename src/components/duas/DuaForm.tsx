import { TextInput } from "react-native";
import { Control, Controller } from "react-hook-form";
import { DuaFormData } from "@/components/duas/schema";

type DuaFormProps = {
    readonly control: Control<DuaFormData>;
};
export default function DuaForm({ control }: DuaFormProps) {
    return (
        <>
            <Controller control={control} name="title" render={({ field: { onChange, onBlur, value } }) => (
                <TextInput placeholder="Dua Title" className="w-full bg-white text-text-secondaryLight p-4 rounded-lg border border-border-light" multiline={true} value={value} onChangeText={onChange} onBlur={onBlur} />
            )} />
            <Controller control={control} name="text" render={({ field: { onChange, onBlur, value } }) => (
                <TextInput placeholder="Dua Text" className="w-full bg-white text-text-secondaryLight p-4 rounded-lg border border-border-light" multiline={true} value={value} onChangeText={onChange} onBlur={onBlur} />
            )} />
        </>
    );
}