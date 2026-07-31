import { emailConfigured, sendEmail } from "@/lib/email";
import {
  decideNurture,
  NURTURE_STAGE,
  nurture24hEmail,
  nurture72hEmail,
  type NurtureLead,
} from "@/lib/leads/nurture";
import type { LeadVertical } from "@/lib/leads/consent";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { errorMessage, logError, logInfo } from "@/lib/log";

export const dynamic = "force-dynamic";

/** Cupom que a última carta oferece. Criado na migração da Fase 5. */
const OFFER_COUPON = "VOLTA20";
const OFFER_LABEL = "20%";

/** Teto por execução: um provedor de e-mail novo tem limite de taxa baixo. */
const BATCH = 100;

/**
 * Régua de recuperação de lead (Fase 5 §5.4, pedido do sócio).
 *
 * Roda uma vez por dia. Para cada lead que deixou e-mail e não virou cliente:
 * 24h depois, o e-mail que lembra a dor; 72h depois, a oferta com cupom. Cada
 * envio carimba a data e move `funnel_stage` — o campo que existia desde a
 * Fase 2B e que ninguém nunca escrevia.
 *
 * Sem provedor de e-mail configurado, responde 200 e não faz nada: é a mesma
 * política do cron de lembretes. O que NUNCA acontece é o carimbo sem o envio
 * — a coluna só é escrita depois do "ok" do provedor, senão um lead seria
 * marcado como contatado sem nunca ter sido.
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
  if (!emailConfigured()) {
    logInfo("cron.leads.skipped", { reason: "email_not_configured" });
    return Response.json({ skipped: true, reason: "email_not_configured" });
  }

  const supabase = createSupabaseAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const now = Date.now();

  const { data: leads, error } = await supabase
    .from("saas_leads")
    .select(
      "id,name,contact,channel,vertical,created_at,funnel_stage,converted_at,opt_out_at,nurture_24h_at,nurture_72h_at,unsubscribe_token",
    )
    .is("converted_at", null)
    .is("opt_out_at", null)
    .eq("channel", "email")
    .in("funnel_stage", ["lead_submitted", "nurture_24h_sent"])
    .order("created_at", { ascending: true })
    .limit(BATCH);

  if (error) {
    logError("cron.leads.query_failed", { message: errorMessage(error) });
    return Response.json({ error: "Falha ao ler leads." }, { status: 500 });
  }

  const counts = { sent24h: 0, sent72h: 0, failed: 0, skipped: 0 };

  for (const row of leads ?? []) {
    const lead: NurtureLead = {
      channel: row.channel as "whatsapp" | "email",
      createdAt: row.created_at as string,
      funnelStage: row.funnel_stage as string,
      convertedAt: row.converted_at as string | null,
      optOutAt: row.opt_out_at as string | null,
      nurture24hAt: row.nurture_24h_at as string | null,
      nurture72hAt: row.nurture_72h_at as string | null,
    };
    const step = decideNurture(lead, now);
    if (step === "none") {
      counts.skipped += 1;
      continue;
    }

    const vertical = (row.vertical as LeadVertical) ?? "barber";
    const unsubscribeUrl = `${appUrl}/descadastro?t=${encodeURIComponent(
      row.unsubscribe_token as string,
    )}`;
    const message =
      step === "nurture_24h"
        ? nurture24hEmail({
            name: row.name as string,
            vertical,
            appUrl,
            unsubscribeUrl,
          })
        : nurture72hEmail({
            name: row.name as string,
            vertical,
            appUrl,
            unsubscribeUrl,
            couponCode: OFFER_COUPON,
            discountLabel: OFFER_LABEL,
          });

    const result = await sendEmail({
      to: row.contact as string,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tag: step,
    });

    if (!result.ok) {
      counts.failed += 1;
      await supabase
        .from("saas_leads")
        .update({
          last_delivery_error: result.skipped
            ? "not_configured"
            : result.reason.slice(0, 300),
        })
        .eq("id", row.id);
      continue;
    }

    const { column, stage } = NURTURE_STAGE[step];
    const update: Record<string, unknown> = {
      [column]: new Date(now).toISOString(),
      funnel_stage: stage,
      last_delivery_error: null,
    };
    if (step === "nurture_72h") update.coupon_code = OFFER_COUPON;

    const { error: updateError } = await supabase
      .from("saas_leads")
      .update(update)
      .eq("id", row.id);
    if (updateError) {
      // O e-mail saiu e o carimbo não entrou: registra alto, porque a próxima
      // execução vai reenviar a mesma etapa para a mesma pessoa.
      logError("cron.leads.stamp_failed", {
        message: errorMessage(updateError),
        step,
      });
    }

    if (step === "nurture_24h") counts.sent24h += 1;
    else counts.sent72h += 1;
  }

  logInfo("cron.leads.done", {
    sent24h: String(counts.sent24h),
    sent72h: String(counts.sent72h),
    failed: String(counts.failed),
  });
  return Response.json({ ok: true, ...counts });
}
