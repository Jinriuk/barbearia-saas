import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { errorMessage, logError } from "@/lib/log";

/**
 * Tira da régua quem virou cliente (Fase 5 §5.4).
 *
 * Sem isto, o dono que preencheu o formulário na terça e criou a conta na
 * quarta receberia, na quinta, um e-mail perguntando se ele quer conhecer o
 * sistema que ele já está usando — e no domingo, um cupom de desconto para
 * assinar o que ele já assinou.
 *
 * O casamento é pelo contato normalizado (o mesmo que a captura grava): o
 * e-mail em minúsculas, ou só os dígitos do telefone. Nunca falha para o
 * chamador: perder a marcação é ruim, mas não pode impedir alguém de criar a
 * conta.
 */
export async function markLeadConverted({
  email,
  phone,
  barbershopId,
}: {
  email?: string | null;
  phone?: string | null;
  barbershopId: string;
}): Promise<void> {
  const candidates = [
    email?.trim().toLowerCase(),
    phone?.replace(/\D/g, ""),
  ].filter((value): value is string => Boolean(value && value.length >= 5));

  if (candidates.length === 0) return;

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("saas_leads")
      .update({
        funnel_stage: "converted",
        converted_at: new Date().toISOString(),
        converted_barbershop_id: barbershopId,
      })
      .in("contact_normalized", candidates)
      .is("converted_at", null);
    if (error) {
      logError("leads.convert_failed", { message: errorMessage(error) });
    }
  } catch (error) {
    logError("leads.convert_failed", { message: errorMessage(error) });
  }
}
