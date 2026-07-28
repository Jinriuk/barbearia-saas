"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { canSetPasswordWithoutCurrent } from "@/lib/auth/recovery";
import { getPublicSupabaseEnv } from "@/lib/env";
import { sharedRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types/domain";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(),
});

const passwordSchema = z
  .object({
    current: z.string().min(1, "Informe a senha atual."),
    password: z.string().min(8).max(72),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "As senhas não coincidem.",
    path: ["confirm"],
  })
  .refine((data) => data.password !== data.current, {
    message: "A nova senha precisa ser diferente da atual.",
    path: ["password"],
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

/**
 * Troca de senha com reautenticação (Fase 0 §0.15).
 *
 * Antes bastava ter a sessão aberta: o celular do balcão fica destravado o dia
 * inteiro em cima da bancada, e qualquer pessoa trocava a senha do dono e
 * tomava a conta. Agora exige a senha atual e oferece derrubar as outras
 * sessões — que é o que se faz depois de desconfiar de um acesso.
 */
export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { success: false, message: "Sessão expirada." };

  // Sem limite, o formulário vira um oráculo para adivinhar a senha atual de
  // quem esqueceu o painel aberto.
  if (!(await sharedRateLimit(`account:password:${user.id}`, 5, 900_000))) {
    return {
      success: false,
      message: "Muitas tentativas. Tente de novo em alguns minutos.",
    };
  }

  // Cliente separado, sem cookies: `signInWithPassword` no cliente da sessão
  // reescreveria os cookies do usuário logado. Aqui ele só confere a senha.
  const { url, anonKey } = getPublicSupabaseEnv();
  const verifier = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });
  if (signInError) {
    return { success: false, message: "A senha atual não confere." };
  }
  // scope 'local' é essencial: o padrão de signOut() é 'global', que revoga
  // TODOS os refresh tokens do usuário no GoTrue — inclusive o da sessão que
  // acabou de pedir a troca. Trocar a senha derrubaria a própria pessoa e
  // todos os aparelhos dela, mesmo sem marcar "sair dos outros aparelhos".
  await verifier.auth.signOut({ scope: "local" });

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
    // A troca de senha limpa a marca de senha provisória do colaborador
    // (§0.17): a partir daqui a senha é dele, não a que o dono digitou.
    data: { must_change_password: false },
  });
  if (error) {
    return {
      success: false,
      message: "Não foi possível alterar a senha. Tente novamente.",
    };
  }

  // Por RPC: a coluna saiu do alcance de quem está logado (§0.15 — marcar o
  // próprio perfil como "precisa trocar" era um desvio da senha atual).
  await supabase.rpc("clear_must_change_password");

  // "Sair dos outros aparelhos": scope 'others' preserva a sessão atual.
  let message = "Senha alterada com sucesso.";
  if (formData.get("signOutOthers") === "on") {
    const { error: signOutError } = await supabase.auth.signOut({
      scope: "others",
    });
    message = signOutError
      ? "Senha alterada. Não foi possível encerrar as outras sessões — tente de novo."
      : "Senha alterada e outras sessões encerradas.";
  }
  revalidatePath("/minha-conta");
  return { success: true, message };
}

const newPasswordSchema = z
  .object({
    password: z.string().min(8).max(72),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "As senhas não coincidem.",
    path: ["confirm"],
  });

/**
 * Definir senha SEM saber a anterior — as duas jornadas legítimas em que isso
 * é correto (ver src/lib/auth/recovery.ts): link de recuperação por e-mail e
 * primeiro acesso do colaborador com senha provisória.
 *
 * Fora delas a ação recusa e manda para /minha-conta, que exige a senha atual.
 * Sem essa checagem, /atualizar-senha seria um desvio da reautenticação do
 * §0.15: bastaria abrir a URL numa sessão esquecida.
 */
export async function setNewPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = newPasswordSchema.safeParse({
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Sessão expirada." };

  if (!(await canSetPasswordWithoutCurrent())) {
    return {
      success: false,
      message:
        "Para trocar a senha, use Minha conta e informe a senha atual. Se você esqueceu a senha, peça um novo link de recuperação.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
    data: { must_change_password: false },
  });
  if (error) {
    return {
      success: false,
      message: "Não foi possível alterar a senha. Tente novamente.",
    };
  }

  await supabase.rpc("clear_must_change_password");
  // O link de recuperação vale uma troca só.
  await supabase.rpc("consume_password_recovery_grant");
  // Trocar a senha por esquecimento é exatamente quando se quer derrubar o
  // resto — inclusive quem estava com o acesso indevido.
  await supabase.auth.signOut({ scope: "others" });
  revalidatePath("/minha-conta");
  return { success: true, message: "Senha definida com sucesso." };
}
