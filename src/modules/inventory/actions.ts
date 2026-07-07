"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types/domain";

const movementSchema = z.object({
  productId: z.uuid(),
  type: z.enum([
    "purchase",
    "sale",
    "adjustment_in",
    "adjustment_out",
    "loss",
    "return",
  ]),
  quantity: z.coerce.number().positive().max(999999),
  unitCost: z.coerce.number().min(0).max(999999).optional(),
  reason: z.string().trim().max(300).optional(),
});

export async function registerMovement(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "inventory:manage")) {
    return { success: false, message: "Sem permissão para mexer no estoque." };
  }

  const parsed = movementSchema.safeParse({
    productId: formData.get("productId"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    unitCost: formData.get("unitCost") || undefined,
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) {
    return { success: false, message: "Revise o produto e a quantidade." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("inventory_movements").insert({
    barbershop_id: tenant.id,
    product_id: parsed.data.productId,
    type: parsed.data.type,
    quantity: parsed.data.quantity,
    unit_cost: parsed.data.unitCost ?? null,
    reason: parsed.data.reason || null,
    created_by: tenant.profileId,
  });
  if (error) {
    return {
      success: false,
      message: "Não foi possível registrar. Tente de novo.",
    };
  }
  revalidatePath("/estoque");
  return { success: true, message: "Movimentação registrada." };
}
