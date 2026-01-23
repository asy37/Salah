import { z } from "zod";

export const duaSchema = z.object({
    title: z.string(),
    text: z.string(),
});

export type DuaFormData = z.infer<typeof duaSchema>;