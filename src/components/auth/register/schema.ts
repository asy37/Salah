import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().optional(),
  surname: z.string().optional(),
  email: z
    .string()
    .min(1, "Email zorunludur")
    .email("Geçerli bir email giriniz"),
  password: z
    .string()
    .min(1, "Şifre gerekli")
    .min(6, "Şifre en az 6 karakter olmalıdır"),
});

export type RegisterFormData = z.infer<typeof registerSchema>;