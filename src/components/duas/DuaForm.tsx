import { Control, Controller } from "react-hook-form";
import { TextInput } from "react-native";
import { DuaFormData } from "./schema";

type DuaFormProps = {
    readonly control: Control<DuaFormData>;
};
export default function DuaForm({ control }: DuaFormProps) {
    return (
        <>
            <Controller control={control} name="title" render={({ field: { onChange, onBlur, value } }) => (
                <TextInput placeholder="Title" className="w-full bg-white text-text-secondaryLight p-4 rounded-lg border border-border-light" multiline={true} value={value} onChangeText={onChange} onBlur={onBlur} />
            )} />
            <Controller control={control} name="text" render={({ field: { onChange, onBlur, value } }) => (
                <TextInput placeholder="Text" className="w-full bg-white text-text-secondaryLight p-4 rounded-lg border border-border-light" multiline={true} value={value} onChangeText={onChange} onBlur={onBlur} />
            )} />
        </>
    );
}