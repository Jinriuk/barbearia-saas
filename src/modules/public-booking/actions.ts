"use server";

import { z } from "zod";
import { publicErrorMessage } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  const token = z
    .string()
    .regex(/^[A-Za-z0-9]{20,40}$/)
    .safeParse(formData.get("token"));
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
