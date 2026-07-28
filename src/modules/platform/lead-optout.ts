"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { errorMessage, logError } from "@/lib/log";

/**
 * Descadastro do lead por token (Fase 0 §0.4).
 *
 * Roda com a chave anônima porque quem clica no link não tem sessão — a RPC
 * `unsubscribe_saas_lead` é `security definer` e só aceita o token. Devolve
 * sempre sucesso: dizer "esse token não existe" transformaria a página num
 * oráculo para descobrir tokens válidos, e para quem se descadastrou o
 * resultado prático é o mesmo.
 */
export async function unsubscribeLead(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("unsubscribe_saas_lead", {
    p_token: token,
  });
  if (error) {
    logError("leads.unsubscribe_failed", { message: errorMessage(error) });
  }
}
