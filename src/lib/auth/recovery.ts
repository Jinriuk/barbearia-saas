import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Quem pode definir uma senha nova SEM informar a atual (Fase 0 §0.15).
 *
 * A tela /atualizar-senha atende duas jornadas em que a pessoa legitimamente
 * não sabe a senha antiga:
 *
 *  1. clicou no link de recuperação do e-mail;
 *  2. é colaborador no primeiro acesso, com a senha provisória que o dono
 *     digitou (§0.17).
 *
 * Fora desses dois casos a troca passa por /minha-conta, que exige a senha
 * atual. Exigir a senha antiga aqui quebraria a recuperação; não exigir
 * deixaria a URL como desvio da reautenticação.
 *
 * A primeira versão marcava a jornada 1 com um cookie httpOnly. A revisão
 * derrubou a ideia: httpOnly protege contra o JavaScript da página, não contra
 * a pessoa sentada no aparelho, que cria o cookie na mão pelo DevTools — e o
 * cenário do §0.15 é exatamente o painel aberto no balcão. A marca passou para
 * o banco (`password_recovery_grants`), emitida só pelo callback depois de a
 * troca do código dar certo, e só com service_role.
 */

/** Janela para concluir a troca depois de clicar no link do e-mail. */
export const RECOVERY_GRANT_MINUTES = 30;

export async function canSetPasswordWithoutCurrent(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const { data: grant } = await supabase.rpc("has_password_recovery_grant");
  if (grant === true) return true;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("profiles")
    .select("must_change_password")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return data?.must_change_password === true;
}
