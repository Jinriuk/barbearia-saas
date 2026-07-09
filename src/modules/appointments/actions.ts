"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types/domain";

const statusSchema = z.enum(["confirmed", "completed", "canceled", "no_show"]);

const manualAppointmentSchema = z
  .object({
    clientId: z.uuid().optional(),
    clientName: z.string().trim().max(100).optional(),
    clientPhone: z.string().trim().max(30).optional(),
    serviceId: z.uuid(),
    professionalId: z.uuid(),
    startsAt: z.iso.datetime({ offset: true }),
    notes: z.string().trim().max(500).optional(),
  })
  .refine(
    (data) =>
      Boolean(data.clientId) ||
      (Boolean(data.clientName?.trim()) && Boolean(data.clientPhone?.trim())),
    { message: "Informe o cliente." },
  );

// Erros da RPC → mensagens que a secretária entende na hora.
const MANUAL_ERRORS: Record<string, string> = {
  SLOT_TAKEN: "Esse horário acabou de ser ocupado. Escolha outro.",
  NOT_ALLOWED: "Seu papel não pode lançar agendamentos.",
  SERVICE_CONTEXT_NOT_FOUND:
    "Esse profissional não executa o serviço escolhido.",
  CLIENT_NOT_FOUND: "Cliente não encontrado. Atualize a página.",
  INVALID_CLIENT_NAME: "Informe o nome do cliente (mínimo 2 letras).",
  INVALID_PHONE: "Informe um WhatsApp válido, com DDD.",
  INVALID_START: "Escolha o dia e o horário.",
};

/** Lançamento manual pela equipe: o balcão registra o horário na agenda. */
export async function createManualAppointment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "appointments:manage")) {
    return { success: false, message: "Sem permissão para agendar." };
  }

  const parsed = manualAppointmentSchema.safeParse({
    clientId: formData.get("clientId") || undefined,
    clientName: formData.get("clientName") || undefined,
    clientPhone: formData.get("clientPhone") || undefined,
    serviceId: formData.get("serviceId"),
    professionalId: formData.get("professionalId"),
    startsAt: formData.get("startsAt"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      message:
        "Revise os campos: cliente, serviço, profissional e horário são obrigatórios.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_manual_appointment", {
    p_barbershop_id: tenant.id,
    p_client_id: parsed.data.clientId ?? null,
    p_client_name: parsed.data.clientName ?? null,
    p_client_phone: parsed.data.clientPhone ?? null,
    p_service_id: parsed.data.serviceId,
    p_professional_id: parsed.data.professionalId,
    p_starts_at: parsed.data.startsAt,
    p_notes: parsed.data.notes ?? null,
  });
  if (error) {
    const known = Object.keys(MANUAL_ERRORS).find((code) =>
      error.message.includes(code),
    );
    return {
      success: false,
      message: known
        ? MANUAL_ERRORS[known]
        : "Não foi possível agendar. Tente novamente.",
    };
  }

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/financeiro");
  return { success: true, message: "Agendamento confirmado na agenda." };
}

/**
 * Horários livres para o lançamento manual — a mesma RPC da página pública,
 * então balcão e cliente enxergam exatamente a mesma disponibilidade.
 */
export async function getManualSlots(
  serviceId: string,
  professionalId: string,
  date: string,
): Promise<{ slots: Array<{ starts_at: string }> } | { error: string }> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "appointments:manage")) {
    return { error: "Sem permissão." };
  }
  const query = z
    .object({
      serviceId: z.uuid(),
      professionalId: z.uuid(),
      date: z.iso.date(),
    })
    .safeParse({ serviceId, professionalId, date });
  if (!query.success) return { error: "Seleção inválida." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_availability", {
    p_slug: tenant.slug,
    p_professional_id: query.data.professionalId,
    p_service_id: query.data.serviceId,
    p_date: query.data.date,
  });
  if (error) return { error: "Não foi possível consultar os horários." };
  return { slots: (data ?? []) as Array<{ starts_at: string }> };
}

// Transições válidas a partir do status atual.
const allowedTransitions: Record<string, string[]> = {
  pending: ["confirmed", "canceled"],
  confirmed: ["completed", "canceled", "no_show"],
};

export async function updateAppointmentStatus(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "appointments:manage")) return;

  const id = String(formData.get("id") ?? "");
  const parsed = statusSchema.safeParse(formData.get("status"));
  if (!id || !parsed.success) return;

  const supabase = await createSupabaseServerClient();
  const { data: appointment } = await supabase
    .from("appointments")
    .select("id,status")
    .eq("id", id)
    .eq("barbershop_id", tenant.id)
    .maybeSingle();
  if (!appointment) return;

  const allowed = allowedTransitions[appointment.status] ?? [];
  if (!allowed.includes(parsed.data)) return;

  await supabase
    .from("appointments")
    .update({ status: parsed.data })
    .eq("id", id)
    .eq("barbershop_id", tenant.id);

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/financeiro");
}
