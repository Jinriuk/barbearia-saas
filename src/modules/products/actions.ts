"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types/domain";

const productSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  salePrice: z.coerce.number().min(0).max(999999),
  costPrice: z.coerce.number().min(0).max(999999).optional(),
  publicVisible: z.coerce.boolean().optional(),
});

function revalidate() {
  revalidatePath("/produtos");
}

export async function saveProduct(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "catalog:manage")) return;

  const parsed = productSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description"),
    salePrice: formData.get("salePrice"),
    costPrice: formData.get("costPrice") || 0,
    publicVisible: formData.get("publicVisible") === "on",
  });
  if (!parsed.success) return;

  const supabase = await createSupabaseServerClient();
  const payload = {
    barbershop_id: tenant.id,
    name: parsed.data.name,
    description: parsed.data.description || null,
    sale_price: parsed.data.salePrice,
    cost_price: parsed.data.costPrice ?? 0,
    public_visible: parsed.data.publicVisible ?? false,
  };
  if (parsed.data.id) {
    await supabase
      .from("products")
      .update(payload)
      .eq("id", parsed.data.id)
      .eq("barbershop_id", tenant.id);
  } else {
    await supabase.from("products").insert(payload);
  }
  revalidate();
}

export async function toggleProductActive(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "catalog:manage")) return;
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("products")
    .update({ active: String(formData.get("active")) !== "true" })
    .eq("id", String(formData.get("id")))
    .eq("barbershop_id", tenant.id);
  revalidate();
}

export async function toggleProductVisible(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "catalog:manage")) return;
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("products")
    .update({ public_visible: String(formData.get("visible")) !== "true" })
    .eq("id", String(formData.get("id")))
    .eq("barbershop_id", tenant.id);
  revalidate();
}

export async function deleteProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "catalog:manage")) {
    return { success: false, message: "Sem permissão para excluir." };
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return { success: false, message: "Produto inválido." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("barbershop_id", tenant.id);
  if (error) {
    return {
      success: false,
      message:
        "Não é possível excluir: o produto já foi usado em agendamentos. Desative-o.",
    };
  }
  revalidate();
  return { success: true, message: "Produto excluído." };
}
