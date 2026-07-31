import { z } from "zod";
import { mapBillingEvent, verifyWebhookSignature } from "@/lib/billing/webhook";
import { applySubscriptionAction } from "@/lib/billing/apply";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { errorMessage, logError, logInfo } from "@/lib/log";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
  id: z.string().min(4).max(120),
  type: z.string().min(3).max(60),
  provider: z.string().min(2).max(40).default("generic"),
  barbershop_id: z.uuid(),
  plan: z.enum(["starter", "plus"]).optional(),
  period: z.enum(["monthly", "yearly"]).optional(),
  amount_cents: z.number().int().positive().optional(),
});

/**
 * Webhook de pagamentos do SaaS (Fase 2B).
 *
 * Segurança e idempotência:
 * 1. Assinatura HMAC + timestamp obrigatórios (anti-replay).
 * 2. Todo evento entra em billing_events com provider_event_id ÚNICO —
 *    o mesmo evento reenviado responde 200 sem reprocessar.
 * 3. Nunca confia só no payload: a assinatura precisa existir para o
 *    tenant e, para ativação, o valor precisa bater com o catálogo de
 *    preços do banco (AMOUNT_MISMATCH não ativa nada). Quando um provedor
 *    real for contratado, a consulta do evento na API dele entra aqui.
 * 4. Payload gravado sem PII sensível (só ids/valores — nada de cartão).
 */
export async function POST(request: Request) {
  const secret = process.env.PAYMENTS_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json(
      { error: "Webhook não configurado." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const verdict = verifyWebhookSignature({
    rawBody,
    signature: request.headers.get("x-webhook-signature"),
    timestamp: request.headers.get("x-webhook-timestamp"),
    secret,
  });
  if (!verdict.ok) {
    logError("webhook.payments.rejected", { reason: verdict.reason });
    return Response.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const parsed = eventSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return Response.json({ error: "Evento inválido." }, { status: 400 });
  }
  const event = parsed.data;

  const supabase = createSupabaseAdminClient();

  // Registro idempotente: o unique (provider, provider_event_id) decide.
  const { data: inserted, error: insertError } = await supabase
    .from("billing_events")
    .insert({
      provider: event.provider,
      provider_event_id: event.id,
      event_type: event.type,
      barbershop_id: event.barbershop_id,
      payload: {
        plan: event.plan ?? null,
        period: event.period ?? null,
        amount_cents: event.amount_cents ?? null,
      },
    })
    .select("id")
    .maybeSingle();
  if (insertError) {
    if (insertError.code === "23505") {
      // Evento repetido: já foi tratado — não duplica pagamento.
      return Response.json({ received: true, duplicate: true });
    }
    logError("webhook.payments.persist_failed", {
      message: errorMessage(insertError),
    });
    return Response.json({ error: "Falha ao registrar." }, { status: 500 });
  }
  const eventRowId = inserted?.id as string;

  const finish = async (
    status: "processed" | "ignored" | "failed",
    error?: string,
  ) => {
    await supabase
      .from("billing_events")
      .update({
        status,
        error: error ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", eventRowId);
  };

  const action = mapBillingEvent(event.type);
  if (action.kind === "ignore") {
    await finish("ignored");
    return Response.json({ received: true, ignored: true });
  }

  // A assinatura precisa existir — evento não cria conta (§8.3/§8.5).
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id,plan,status,current_period_end")
    .eq("barbershop_id", event.barbershop_id)
    .maybeSingle();
  if (!subscription) {
    await finish("failed", "SUBSCRIPTION_NOT_FOUND");
    return Response.json(
      { error: "Assinatura não encontrada." },
      { status: 404 },
    );
  }

  let plan: string | undefined;
  let period: "monthly" | "yearly" | undefined;
  let priceCents: number | undefined;
  let auditAction = "billing.canceled";

  if (action.kind === "activate") {
    plan = event.plan ?? (subscription.plan as "starter" | "plus");
    period = event.period ?? "monthly";
    // Valor precisa bater com o catálogo vigente do banco.
    const { data: catalog } = await supabase.rpc("get_plan_catalog");
    const price = (catalog ?? []).find(
      (row: { plan: string; period: string; price_cents: number }) =>
        row.plan === plan && row.period === period,
    );
    if (!price) {
      await finish("failed", "PRICE_NOT_FOUND");
      return Response.json({ error: "Preço não catalogado." }, { status: 422 });
    }
    if (
      event.amount_cents !== undefined &&
      event.amount_cents !== price.price_cents
    ) {
      await finish("failed", "AMOUNT_MISMATCH");
      return Response.json({ error: "Valor divergente." }, { status: 422 });
    }
    priceCents = price.price_cents;
    auditAction = "billing.payment_approved";
  } else if (action.kind === "past_due") {
    auditAction = "billing.payment_failed";
  } else if (action.kind === "suspend") {
    auditAction = "billing.chargeback";
  }

  // A transição de estado é a mesma do webhook do gateway (Fase 5 §5.1):
  // mora em lib/billing/apply para não haver duas verdades sobre o que um
  // pagamento aprovado faz com a assinatura.
  const applied = await applySubscriptionAction(supabase, {
    barbershopId: event.barbershop_id,
    action: action.kind,
    plan,
    period,
    priceCents,
    auditAction,
    auditMetadata: {
      event_type: event.type,
      provider_event_id: event.id,
      provider: event.provider,
    },
  });
  if (!applied.ok) {
    await finish("failed", applied.reason);
    return Response.json({ error: "Falha ao aplicar." }, { status: 500 });
  }

  await finish("processed");
  logInfo("webhook.payments.processed", {
    type: event.type,
    action: action.kind,
  });
  return Response.json({ received: true, action: action.kind });
}
