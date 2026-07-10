import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUtcNextDayRange } from "@/lib/dates";
import { whatsAppNumber } from "@/lib/contact";
import { normalizeVertical } from "@/lib/verticals";
import { reminderParts } from "@/lib/whatsapp";
import {
  sendReminderTemplate,
  whatsAppCloudConfigured,
} from "@/lib/whatsapp-cloud";
import { errorMessage, logError, logInfo } from "@/lib/log";

export const dynamic = "force-dynamic";

// Teto por execução: bem abaixo do limite diário do número central e
// suficiente para a base atual; o que sobrar sai na execução seguinte.
const MAX_SENDS_PER_RUN = 500;

/**
 * Lembrete automático da véspera (Vercel Cron, diário): para cada negócio
 * ativo com lembretes ligados, dispara o template oficial do WhatsApp para
 * os horários de AMANHÃ (no fuso do tenant) ainda pendentes/confirmados e
 * sem lembrete enviado. Idempotente via appointments.reminder_sent_at.
 *
 * Sem WHATSAPP_* configurado a rota responde 200 e não faz nada — o botão
 * manual "Lembrar no WhatsApp" continua cobrindo a operação.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET não configurado." },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (!whatsAppCloudConfigured()) {
    return Response.json({ skipped: "WHATSAPP_* não configurado." });
  }

  const supabase = createSupabaseAdminClient();
  const { data: tenants, error: tenantsError } = await supabase
    .from("barbershops")
    .select(
      "id,name,timezone,vertical,settings:tenant_settings!inner(whatsapp_reminders_enabled)",
    )
    .in("status", ["trial", "active"]);
  if (tenantsError) {
    logError("cron.reminders.tenants_query_failed", {
      message: errorMessage(tenantsError),
    });
    return Response.json(
      { error: "Falha ao listar negócios com lembrete ativo." },
      { status: 500 },
    );
  }

  let sent = 0;
  let failed = 0;
  let withoutPhone = 0;

  for (const tenant of tenants ?? []) {
    const settings = Array.isArray(tenant.settings)
      ? tenant.settings[0]
      : tenant.settings;
    if (!settings?.whatsapp_reminders_enabled) continue;
    if (sent >= MAX_SENDS_PER_RUN) break;

    const { start, end } = getUtcNextDayRange(tenant.timezone);
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("id,starts_at,client:clients(name,phone),service:services(name)")
      .eq("barbershop_id", tenant.id)
      .in("status", ["pending", "confirmed"])
      .is("reminder_sent_at", null)
      .gte("starts_at", start.toISOString())
      .lt("starts_at", end.toISOString())
      .order("starts_at")
      .limit(200);
    if (appointmentsError) {
      // Um tenant com consulta quebrada não pode derrubar o lote inteiro.
      failed += 1;
      logError("cron.reminders.appointments_query_failed", {
        tenantId: tenant.id,
        message: errorMessage(appointmentsError),
      });
      continue;
    }

    for (const appointment of appointments ?? []) {
      if (sent >= MAX_SENDS_PER_RUN) break;
      const client = Array.isArray(appointment.client)
        ? appointment.client[0]
        : appointment.client;
      const service = Array.isArray(appointment.service)
        ? appointment.service[0]
        : appointment.service;
      const to = whatsAppNumber(client?.phone);
      if (!to) {
        withoutPhone += 1;
        continue;
      }

      const result = await sendReminderTemplate(
        to,
        reminderParts(
          {
            clientName: client?.name ?? "Cliente",
            serviceName: service?.name ?? "seu atendimento",
            startsAt: appointment.starts_at,
          },
          {
            name: tenant.name,
            timezone: tenant.timezone,
            vertical: normalizeVertical(tenant.vertical),
          },
        ),
      );
      if (result.ok) {
        sent += 1;
        const { error: markError } = await supabase
          .from("appointments")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", appointment.id);
        if (markError) {
          // Enviou mas não marcou: o próximo run pode reenviar — precisa
          // aparecer no log para investigação, não pode passar em silêncio.
          logError("cron.reminders.mark_sent_failed", {
            appointmentId: appointment.id,
            message: errorMessage(markError),
          });
        }
      } else {
        failed += 1;
        logError("cron.reminders.send_failed", {
          appointmentId: appointment.id,
          tenantId: tenant.id,
          message: result.error,
        });
      }
    }
  }

  const summary = { sent, failed, withoutPhone };
  if (failed) logError("cron.reminders.completed_with_failures", summary);
  else logInfo("cron.reminders.completed", summary);
  return Response.json(summary, { status: failed ? 500 : 200 });
}
