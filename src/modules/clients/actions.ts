"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientSchema } from "@/lib/validators/entities";
import type { ActionState } from "@/types/domain";

export async function saveClient(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = clientSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { success: false, message: "Revise o nome e o telefone." };
  }
  const tenant = await requireTenant();
  if (!can(tenant.role, "clients:manage")) {
    return { success: false, message: "Sem permissão para salvar clientes." };
  }
  const supabase = await createSupabaseServerClient();
  const payload = {
    barbershop_id: tenant.id,
    name: parsed.data.name,
    phone: parsed.data.phone,
    phone_normalized: parsed.data.phone.replace(/\D/g, ""),
    email: parsed.data.email || null,
    notes: parsed.data.notes || null,
  };
  const { error } = parsed.data.id
    ? await supabase
        .from("clients")
        .update(payload)
        .eq("id", parsed.data.id)
        .eq("barbershop_id", tenant.id)
    : await supabase.from("clients").insert(payload);
  if (error) {
    return {
      success: false,
      message: "Não foi possível salvar o cliente. Tente novamente.",
    };
  }
  revalidatePath("/clientes");
  return { success: true, message: "Cliente adicionado." };
}

/**
 * Exclusão lógica: arquiva o cliente (active = false) mantendo o histórico.
 * Substitui o antigo toggle "Ativar/Desativar".
 */
export async function archiveClient(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { success: false, message: "Cliente inválido." };
  const tenant = await requireTenant();
  if (!can(tenant.role, "clients:manage")) {
    return { success: false, message: "Sem permissão para arquivar clientes." };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .update({ active: false })
    .eq("id", id)
    .eq("barbershop_id", tenant.id);
  if (error) {
    return { success: false, message: "Não foi possível arquivar o cliente." };
  }
  revalidatePath("/clientes");
  return { success: true, message: "Cliente arquivado." };
}

/** Restaura um cliente arquivado (active = true). */
export async function restoreClient(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { success: false, message: "Cliente inválido." };
  const tenant = await requireTenant();
  if (!can(tenant.role, "clients:manage")) {
    return { success: false, message: "Sem permissão para restaurar clientes." };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .update({ active: true })
    .eq("id", id)
    .eq("barbershop_id", tenant.id);
  if (error) {
    return { success: false, message: "Não foi possível restaurar o cliente." };
  }
  revalidatePath("/clientes");
  return { success: true, message: "Cliente restaurado." };
}
