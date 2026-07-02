import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
});

export const signupSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Informe seu nome.").max(100),
});

export const resetPasswordSchema = z.object({
  email: z.email("Informe um e-mail válido."),
});

export const barbershopSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(63)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use letras minúsculas, números e hífen.",
    ),
});
