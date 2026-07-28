"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { formatBRL } from "@/lib/financial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types/domain";

const statusSchema = z.enum([
  "confirmed",
  "in_progress",
  "completed",
  "canceled",
  "no_show",
]);

const RESCHEDULE_ERRORS: Record<string, string> = {
  APPOINTMENT_CONFLICT:
    "Esse horário acabou de ser ocupado. O horário anterior foi mantido.",
  SCHEDULE_BLOCKED: "O profissional está bloqueado nesse horário.",
  NOT_AUTHORIZED: "Sem permissão para remarcar este atendimento.",
  INVALID_STATUS_TRANSITION:
    "Só é possível remarcar horários pendentes ou confirmados.",
  INVALID_START: "Escolha um horário no futuro.",
  APPOINTMENT_NOT_FOUND: "Atendimento não encontrado. Atualize a página.",
};

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

// Transições válidas a partir do status atual (espelho da máquina de
// estados do banco — trigger enforce_appointment_transition).
// completed/no_show → confirmed são correções explícitas de engano.
const allowedTransitions: Record<string, string[]> = {
  pending: ["confirmed", "canceled", "no_show"],
  confirmed: ["in_progress", "completed", "canceled", "no_show"],
  in_progress: ["completed", "canceled", "confirmed"],
  completed: ["confirmed"],
  no_show: ["confirmed"],
};

/**
 * Remarcação transacional (Fase 2): RPC valida bloqueios e deixa a exclusion
 * constraint arbitrar conflito — em falha, o horário anterior fica de pé.
 * O histórico é preservado (mesma linha + audit_log com os horários antigos).
 */
export async function rescheduleAppointment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "appointments:manage")) {
    return { success: false, message: "Sem permissão para remarcar." };
  }
  const parsed = z
    .object({ id: z.uuid(), startsAt: z.iso.datetime({ offset: true }) })
    .safeParse({ id: formData.get("id"), startsAt: formData.get("startsAt") });
  if (!parsed.success) {
    return { success: false, message: "Escolha o novo dia e horário." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reschedule_appointment", {
    p_appointment_id: parsed.data.id,
    p_starts_at: parsed.data.startsAt,
  });
  if (error) {
    const known = Object.keys(RESCHEDULE_ERRORS).find((code) =>
      error.message.includes(code),
    );
    return {
      success: false,
      message: known
        ? RESCHEDULE_ERRORS[known]
        : "Não foi possível remarcar. Tente novamente.",
    };
  }
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { success: true, message: "Atendimento remarcado." };
}

// Confirmação curta do que acabou de acontecer (§8.2 pede o objeto na
// frase, não só "Salvo").
const STATUS_DONE: Record<string, string> = {
  confirmed: "Horário confirmado.",
  in_progress: "Atendimento iniciado.",
  completed: "Atendimento concluído — a receber lançado no Financeiro.",
  canceled: "Horário cancelado.",
  no_show: "Falta registrada.",
};

/** Muda a situação do atendimento e devolve o que aconteceu, para a tela. */
export async function setAppointmentStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "appointments:manage")) {
    return { success: false, message: "Sem permissão para mudar a agenda." };
  }

  const id = String(formData.get("id") ?? "");
  const parsed = statusSchema.safeParse(formData.get("status"));
  if (!id || !parsed.success) {
    return { success: false, message: "Situação inválida." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: appointment } = await supabase
    .from("appointments")
    .select("id,status")
    .eq("id", id)
    .eq("barbershop_id", tenant.id)
    .maybeSingle();
  if (!appointment) {
    return { success: false, message: "Atendimento não encontrado." };
  }

  const allowed = allowedTransitions[appointment.status] ?? [];
  if (!allowed.includes(parsed.data)) {
    return {
      success: false,
      message: "Essa mudança não é permitida a partir da situação atual.",
    };
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      status: parsed.data,
      ...(parsed.data === "canceled"
        ? { canceled_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", id)
    .eq("barbershop_id", tenant.id);
  if (error) {
    return {
      success: false,
      message: error.message.includes("COMPLETION_IN_FUTURE")
        ? "Não dá para concluir um horário que ainda não começou."
        : error.message.includes("START_IN_FUTURE")
          ? "Não dá para iniciar um horário que ainda não começou."
          : "Não foi possível mudar a situação. Tente novamente.",
    };
  }

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/financeiro");
  return {
    success: true,
    message: STATUS_DONE[parsed.data] ?? "Agenda atualizada.",
  };
}

/** Compatibilidade com a visão em lista, que não exibe retorno da ação. */
export async function updateAppointmentStatus(formData: FormData) {
  await setAppointmentStatus({ success: false, message: "" }, formData);
}

const COMPLETE_ERRORS: Record<string, string> = {
  APPOINTMENT_NOT_FOUND: "Atendimento não encontrado. Atualize a página.",
  NOT_AUTHORIZED: "Sem permissão para concluir este atendimento.",
  INVALID_STATUS_TRANSITION:
    "Só dá para finalizar um horário confirmado ou em atendimento.",
  COMPLETION_IN_FUTURE:
    "Não dá para concluir um horário que ainda não começou.",
  PAYMENT_METHOD_REQUIRED: "Informe como o cliente pagou.",
};

/**
 * "Finalizar e receber" (§7.2): conclui o atendimento e captura o pagamento
 * no mesmo gesto. Serviço coberto por plano não cobra nada — a RPC avisa.
 */
export async function completeAndReceiveAppointment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "appointments:manage")) {
    return { success: false, message: "Sem permissão para concluir." };
  }
  const parsed = z
    .object({
      id: z.uuid(),
      paymentMethod: z.enum(["cash", "card", "pix", "other"]),
    })
    .safeParse({
      id: formData.get("id"),
      paymentMethod: formData.get("paymentMethod"),
    });
  if (!parsed.success) {
    return { success: false, message: "Informe como o cliente pagou." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    "complete_and_receive_appointment",
    {
      p_appointment_id: parsed.data.id,
      p_payment_method: parsed.data.paymentMethod,
    },
  );
  if (error) {
    const known = Object.keys(COMPLETE_ERRORS).find((code) =>
      error.message.includes(code),
    );
    return {
      success: false,
      message: known
        ? COMPLETE_ERRORS[known]
        : "Não foi possível finalizar. Tente novamente.",
    };
  }

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/financeiro");
  revalidatePath("/clientes");

  const result = (data ?? {}) as { received?: number; covered?: boolean };
  if (result.covered) {
    return {
      success: true,
      message: "Atendimento concluído — coberto pelo plano do cliente.",
    };
  }
  return {
    success: true,
    message: `Atendimento concluído — ${formatBRL(Number(result.received ?? 0))} recebido.`,
  };
}
