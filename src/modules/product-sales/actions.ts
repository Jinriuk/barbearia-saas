"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types/domain";

const idSchema = z.uuid();

function revalidate() {
  revalidatePath("/produtos");
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");
}

/** Confirma a venda de um produto reservado: baixa no estoque + receita. */
export async function confirmProductSale(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "appointments:manage")) {
    return { success: false, message: "Sem permissão para confirmar vendas." };
  }
  const parsed = idSchema.safeParse(formData.get("id"));
  if (!parsed.success) return { success: false, message: "Reserva inválida." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("confirm_product_sale", {
    p_appointment_product_id: parsed.data,
  });
  if (error) {
    return { success: false, message: "Não foi possível confirmar a venda." };
  }
  revalidate();
  return { success: true, message: "Venda confirmada e estoque atualizado." };
}

/** Cancela uma reserva pendente: sem baixa no estoque, sem receita. */
export async function cancelProductSale(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "appointments:manage")) {
    return { success: false, message: "Sem permissão para cancelar reservas." };
  }
  const parsed = idSchema.safeParse(formData.get("id"));
  if (!parsed.success) return { success: false, message: "Reserva inválida." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("cancel_product_sale", {
    p_appointment_product_id: parsed.data,
  });
  if (error) {
    return { success: false, message: "Não foi possível cancelar a reserva." };
  }
  revalidate();
  return { success: true, message: "Reserva cancelada." };
}
