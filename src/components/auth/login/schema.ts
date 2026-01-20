import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email gerekli")
    .email("Geçerli bir email girin"),
  password: z
    .string()
    .min(1, "Şifre gerekli")
    .min(6, "Şifre en az 6 karakter olmalı"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
