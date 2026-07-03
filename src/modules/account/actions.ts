"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types/domain";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(),
});

const passwordSchema = z
  .object({
    password: z.string().min(8).max(72),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "As senhas não coincidem.",
    path: ["confirm"],
  });

export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { success: false, message: "Revise nome e telefone." };
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Sessão expirada." };

  const { error } = await supabase
    .from("profiles")
    .update({ name: parsed.data.name, phone: parsed.data.phone || null })
    .eq("auth_user_id", user.id);
  if (error) {
    return { success: false, message: "Não foi possível salvar o perfil." };
  }
  revalidatePath("/minha-conta");
  revalidatePath("/dashboard");
  return { success: true, message: "Perfil atualizado." };
}

export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "A senha precisa ter ao menos 8 caracteres.",
    };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return {
      success: false,
      message: "Não foi possível alterar a senha. Tente novamente.",
    };
  }
  return { success: true, message: "Senha alterada com sucesso." };
}
