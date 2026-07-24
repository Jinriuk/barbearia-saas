"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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

/**
 * Exclusão definitiva (LGPD, direito de eliminação): remove o registro do
 * cliente. Quando há histórico de atendimentos (FK on delete restrict), o
 * registro é ANONIMIZADO no lugar — o histórico financeiro permanece, mas
 * sem nenhum dado pessoal. Restrito a owner/manager (mesma regra da policy
 * de DELETE no banco).
 */
export async function deleteClientPermanently(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { success: false, message: "Cliente inválido." };
  const tenant = await requireTenant();
  if (tenant.role !== "owner" && tenant.role !== "manager") {
    return { success: false, message: "Sem permissão para excluir clientes." };
  }
  const supabase = await createSupabaseServerClient();
  // .select() para contar as linhas: RLS negando (ou id de outro tenant)
  // retorna error=null com 0 linhas — sem a contagem viraria um falso
  // "excluído com sucesso" numa operação LGPD.
  const { data: deleted, error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("barbershop_id", tenant.id)
    .select("id");
  if (!error) {
    if (!deleted?.length) {
      return { success: false, message: "Cliente não encontrado." };
    }
    revalidatePath("/clientes");
    return { success: true, message: "Cliente excluído definitivamente." };
  }
  if (error.code !== "23503") {
    return { success: false, message: "Não foi possível excluir o cliente." };
  }
  // Tem agendamentos vinculados: anonimiza. O telefone é not null + único
  // por tenant, então entra um placeholder numérico.
  const randomDigits = Array.from(
    crypto.getRandomValues(new Uint8Array(13)),
    (byte) => byte % 10,
  ).join("");
  const { data: anonymized, error: anonError } = await supabase
    .from("clients")
    .update({
      name: "Cliente removido",
      phone: "(removido)",
      // 2 zeros + 13 dígitos aleatórios: passa no check ^[0-9]{8,15}$, não
      // colide com telefone real (nenhum começa com 00) e não depende do
      // relógio — Date.now() colidia em duas exclusões no mesmo milissegundo.
      phone_normalized: `00${randomDigits}`,
      email: null,
      birth_date: null,
      notes: null,
      active: false,
    })
    .eq("id", id)
    .eq("barbershop_id", tenant.id)
    .select("id");
  if (anonError || !anonymized?.length) {
    return { success: false, message: "Não foi possível excluir o cliente." };
  }
  revalidatePath("/clientes");
  return {
    success: true,
    message:
      "Dados pessoais removidos. O histórico de atendimentos foi mantido de forma anônima.",
  };
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
    return {
      success: false,
      message: "Sem permissão para restaurar clientes.",
    };
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

const contactOutcomeSchema = z.enum([
  "sem_resposta",
  "respondeu",
  "agendou",
  "nao_quer_contato",
]);

/**
 * Registra que um contato de retorno foi iniciado (Fase 3). O conteúdo da
 * conversa NÃO é registrado — apenas canal, momento e, depois, o resultado.
 * Um contato por clique; o segmento "para chamar" aplica carência de 14 dias.
 */
export async function logClientContact(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "clients:manage")) return;
  const clientId = z.uuid().safeParse(formData.get("clientId"));
  if (!clientId.success) return;

  const supabase = await createSupabaseServerClient();
  await supabase.from("client_contacts").insert({
    barbershop_id: tenant.id,
    client_id: clientId.data,
    channel: "whatsapp",
    created_by: tenant.profileId,
  });
  revalidatePath("/clientes");
  revalidatePath("/dashboard");
}

/** Marca o resultado do último contato do cliente. */
export async function setContactOutcome(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "clients:manage")) return;
  const clientId = z.uuid().safeParse(formData.get("clientId"));
  const outcome = contactOutcomeSchema.safeParse(formData.get("outcome"));
  if (!clientId.success || !outcome.success) return;

  const supabase = await createSupabaseServerClient();
  const { data: last } = await supabase
    .from("client_contacts")
    .select("id")
    .eq("barbershop_id", tenant.id)
    .eq("client_id", clientId.data)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last) return;

  await supabase
    .from("client_contacts")
    .update({ outcome: outcome.data })
    .eq("id", last.id)
    .eq("barbershop_id", tenant.id);

  // "Não quer contato" é opt-out: interrompe régua e sai de "para chamar".
  if (outcome.data === "nao_quer_contato") {
    await supabase
      .from("clients")
      .update({ contact_opt_out: true })
      .eq("id", clientId.data)
      .eq("barbershop_id", tenant.id);
  }
  revalidatePath("/clientes");
  revalidatePath("/dashboard");
}

/** Liga/desliga o opt-out de contato do cliente. */
export async function toggleClientOptOut(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "clients:manage")) return;
  const clientId = z.uuid().safeParse(formData.get("clientId"));
  if (!clientId.success) return;
  const optOut = String(formData.get("optOut")) === "true";

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("clients")
    .update({ contact_opt_out: !optOut })
    .eq("id", clientId.data)
    .eq("barbershop_id", tenant.id);
  revalidatePath("/clientes");
}
