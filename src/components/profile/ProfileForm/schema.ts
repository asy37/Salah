import { z } from "zod";

const optionalText = z.union([z.literal(""), z.string()]).optional();
const optionalEmail = z.union([z.literal(""), z.string().email("Geçerli bir email giriniz")]);
const optionalPassword = z.union([
  z.literal(""),
  z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
]);

export const profileSchema = z.object({
  name: optionalText,
  surname: optionalText,
  email: optionalEmail,
  password: optionalPassword,
});

export type ProfileFormData = z.infer<typeof profileSchema>;