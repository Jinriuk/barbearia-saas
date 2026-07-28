"use server";

import { publicErrorMessage } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  publicRescheduleSchema,
  publicReservationToken,
} from "@/lib/validators/entities";
import type { ActionState } from "@/types/domain";

/**
 * Cancelamento pelo cliente via token público (Fase 2). O token é limitado à
 * reserva, expira junto com o horário e nunca expõe o UUID interno. A regra
 * de antecedência (cancellation_notice_minutes) é aplicada no banco.
 */
export async function cancelPublicReservation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = publicReservationToken.safeParse(formData.get("token"));
  if (!token.success) {
    return { success: false, message: "Reserva não encontrada." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("cancel_public_appointment", {
    p_token: token.data,
  });
  if (error) {
    return { success: false, message: publicErrorMessage(error) };
  }
  return { success: true, message: "Reserva cancelada." };
}

/**
 * Remarcação pelo próprio cliente (Fase 4 — pilar G1, "menos mensagens").
 * Antes daqui, remarcar era um link que mandava cancelar e refazer tudo.
 *
 * Serviço e profissional não mudam: quem quer trocar de profissional faz uma
 * reserva nova. Todas as regras (antecedência, horizonte, expediente,
 * bloqueios e conflito) são reconferidas no banco — esta action só carrega o
 * token e o horário escolhido.
 */
export async function reschedulePublicReservation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = publicRescheduleSchema.safeParse({
    token: formData.get("token"),
    startsAt: formData.get("startsAt"),
  });
  if (!parsed.success) {
    return { success: false, message: "Escolha um horário para remarcar." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reschedule_public_appointment", {
    p_token: parsed.data.token,
    p_starts_at: parsed.data.startsAt,
  });
  if (error) {
    return { success: false, message: publicErrorMessage(error) };
  }
  return { success: true, message: "Horário remarcado." };
}
