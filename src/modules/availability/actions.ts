"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { zonedDateTimeToUtc } from "@/lib/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types/domain";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const weeklyRulesSchema = z
  .array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      startsAt: z.string().regex(timePattern),
      endsAt: z.string().regex(timePattern),
      slotIntervalMinutes: z.number().int().min(5).max(120),
    }),
  )
  .max(40);

const AVAILABILITY_ERRORS: Record<string, string> = {
  NOT_AUTHORIZED: "Você não pode editar o expediente deste profissional.",
  INVALID_WINDOW:
    "Cada janela precisa terminar depois de começar (turnos não podem cruzar a meia-noite).",
  OVERLAPPING_WINDOWS:
    "Há janelas sobrepostas no mesmo dia. Ajuste os horários.",
  INVALID_INTERVAL:
    "O intervalo entre horários deve ficar entre 5 e 120 minutos.",
  PROFESSIONAL_NOT_FOUND: "Profissional não encontrado.",
};

function revalidateSchedule(slug: string) {
  revalidatePath("/equipe/horarios");
  revalidatePath("/agenda");
  // A disponibilidade pública muda junto.
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/agendar`);
}

/**
 * Substitui o expediente semanal do profissional (RPC transacional).
 * Alterar expediente nunca cancela horários existentes: a RPC devolve
 * quantos agendamentos futuros ficaram fora das novas janelas e o aviso é
 * mostrado à equipe.
 */
export async function saveWeeklyAvailability(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();

  const professionalId = z.uuid().safeParse(formData.get("professionalId"));
  let parsedRules: unknown;
  try {
    parsedRules = JSON.parse(String(formData.get("rules") ?? "[]"));
  } catch {
    return { success: false, message: "Não foi possível ler os horários." };
  }
  const rules = weeklyRulesSchema.safeParse(parsedRules);
  if (!professionalId.success || !rules.success) {
    return { success: false, message: "Revise os horários informados." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("set_professional_availability", {
    p_professional_id: professionalId.data,
    p_rules: rules.data,
  });
  if (error) {
    const known = Object.keys(AVAILABILITY_ERRORS).find((code) =>
      error.message.includes(code),
    );
    return {
      success: false,
      message: known
        ? AVAILABILITY_ERRORS[known]
        : "Não foi possível salvar o expediente.",
    };
  }

  revalidateSchedule(tenant.slug);
  const outside = Number(
    (data as { futureOutside?: number } | null)?.futureOutside ?? 0,
  );
  return {
    success: true,
    message:
      outside > 0
        ? `Expediente salvo. Atenção: ${outside} agendamento(s) futuro(s) ficaram fora das novas janelas — nada foi cancelado, ajuste na agenda se necessário.`
        : "Expediente salvo.",
  };
}

const blockSchema = z
  .object({
    professionalId: z.uuid(),
    date: z.iso.date(),
    endDate: z.iso.date().optional(),
    startTime: z.string().regex(timePattern).optional(),
    endTime: z.string().regex(timePattern).optional(),
    allDay: z.boolean(),
    reason: z.string().trim().max(200).optional(),
  })
  .refine((data) => data.allDay || (data.startTime && data.endTime), {
    message: "Informe o horário do bloqueio.",
  });

/**
 * Cria uma folga/férias/bloqueio pontual. O bloqueio é respeitado pela
 * disponibilidade pública e pelo lançamento manual (checagem nas RPCs).
 * Agendamentos já existentes no período não são cancelados — a equipe é
 * avisada da quantidade em conflito.
 */
export async function createScheduleBlock(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();

  const parsed = blockSchema.safeParse({
    professionalId: formData.get("professionalId"),
    date: formData.get("date"),
    endDate: formData.get("endDate") || undefined,
    startTime: formData.get("startTime") || undefined,
    endTime: formData.get("endTime") || undefined,
    allDay: formData.get("allDay") === "on",
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) {
    return { success: false, message: "Revise o período do bloqueio." };
  }

  const { professionalId, date, endDate, startTime, endTime, allDay, reason } =
    parsed.data;
  const lastDay = endDate && endDate >= date ? endDate : date;

  let startsAt: Date;
  let endsAt: Date;
  if (allDay) {
    startsAt = zonedDateTimeToUtc(date, "00:00", tenant.timezone);
    const [y, m, d] = lastDay.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    endsAt = zonedDateTimeToUtc(
      next.toISOString().slice(0, 10),
      "00:00",
      tenant.timezone,
    );
  } else {
    startsAt = zonedDateTimeToUtc(date, startTime!, tenant.timezone);
    endsAt = zonedDateTimeToUtc(lastDay, endTime!, tenant.timezone);
  }
  if (endsAt <= startsAt) {
    return { success: false, message: "O fim deve ser depois do início." };
  }

  const supabase = await createSupabaseServerClient();
  // RLS decide quem pode: owner/manager, ou o próprio profissional quando
  // allow_self_blocks está ligado.
  const { error } = await supabase.from("schedule_blocks").insert({
    barbershop_id: tenant.id,
    professional_id: professionalId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    reason: reason || null,
    created_by: tenant.profileId,
  });
  if (error) {
    return {
      success: false,
      message: "Não foi possível criar o bloqueio (verifique sua permissão).",
    };
  }

  // Aviso de conflito: horários já marcados dentro do período bloqueado.
  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("barbershop_id", tenant.id)
    .eq("professional_id", professionalId)
    .in("status", ["pending", "confirmed"])
    .lt("starts_at", endsAt.toISOString())
    .gt("ends_at", startsAt.toISOString());

  revalidateSchedule(tenant.slug);
  return {
    success: true,
    message:
      (count ?? 0) > 0
        ? `Bloqueio criado. Atenção: ${count} agendamento(s) já marcados dentro do período — remarque ou cancele na agenda.`
        : "Bloqueio criado.",
  };
}

export async function deleteScheduleBlock(formData: FormData) {
  const tenant = await requireTenant();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("schedule_blocks")
    .delete()
    .eq("id", id.data)
    .eq("barbershop_id", tenant.id);
  revalidateSchedule(tenant.slug);
}
