/**
 * Marca de sessão vinda de link de recuperação (Fase 0 §0.15).
 *
 * A tela /atualizar-senha atende duas jornadas em que a pessoa NÃO sabe a
 * senha atual:
 *
 *  1. esqueceu a senha e clicou no link do e-mail;
 *  2. é colaborador no primeiro acesso, com a senha provisória que o dono
 *     digitou (§0.17) — nesse caso a marca vem de `profiles.must_change_password`.
 *
 * Fora desses dois casos a troca passa por /minha-conta, que exige a senha
 * atual. Sem essa separação, exigir a senha antiga quebraria a recuperação —
 * e não exigir deixaria qualquer sessão aberta trocar a senha do dono.
 */
import "server-only";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const RECOVERY_COOKIE = "nb_pw_recovery";

/** 30 minutos: tempo de sobra para trocar a senha, curto para ficar guardado. */
export const RECOVERY_MAX_AGE = 60 * 30;

/**
 * A sessão atual pode definir senha sem informar a anterior?
 *
 * Fica aqui, e não no módulo de server actions, porque não é uma ação do
 * usuário: exportá-la de um arquivo `"use server"` a tornaria chamável do
 * navegador com qualquer id.
 */
export async function canSetPasswordWithoutCurrent(
  authUserId: string,
): Promise<boolean> {
  if ((await cookies()).get(RECOVERY_COOKIE)?.value === "1") return true;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("must_change_password")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  return data?.must_change_password === true;
}
