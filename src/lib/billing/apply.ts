import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { periodDays } from "@/lib/billing/webhook";
import { errorMessage } from "@/lib/log";

export type SubscriptionAction = "activate" | "past_due" | "suspend" | "cancel";

/**
 * Aplica na assinatura o que o pagamento decidiu (Fase 5 §5.1).
 *
 * Vive fora das rotas porque agora existem dois webhooks — o genérico da Fase
 * 2B e o do Mercado Pago — e a transição de estado precisa ser a MESMA nos
 * dois. Cada rota valida o valor contra a sua própria fonte (o catálogo, no
 * genérico; o checkout gravado, no do gateway) e chama daqui para diante.
 *
 * O que NÃO está aqui, de propósito: o cancelamento agendado. A Fase 0 pôs no
 * banco a trava que limpa o pedido quando o período é estendido, justamente
 * para não depender de o webhook lembrar.
 */
export async function applySubscriptionAction(
  supabase: SupabaseClient,
  {
    barbershopId,
    action,
    plan,
    period,
    priceCents,
    couponCode,
    discountCents,
    auditAction,
    auditMetadata,
  }: {
    barbershopId: string;
    action: SubscriptionAction;
    /** Só usados em `activate`. */
    plan?: string;
    period?: "monthly" | "yearly";
    /** Preço de tabela que passa a valer na renovação (não o valor com desconto). */
    priceCents?: number;
    couponCode?: string | null;
    discountCents?: number;
    auditAction: string;
    auditMetadata: Record<string, unknown>;
  },
): Promise<
  { ok: true; subscriptionId: string } | { ok: false; reason: string }
> {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id,plan,status,current_period_end,billing_period")
    .eq("barbershop_id", barbershopId)
    .maybeSingle();

  if (!subscription) return { ok: false, reason: "SUBSCRIPTION_NOT_FOUND" };

  const nowIso = new Date().toISOString();
  let update: Record<string, unknown>;

  if (action === "activate") {
    const effectivePeriod =
      period ??
      (subscription.billing_period as "monthly" | "yearly") ??
      "monthly";
    // Renovação soma ao período vigente; regularização de atraso parte de
    // agora, senão quem paga com 20 dias de atraso compraria 10 dias.
    const base = subscription.current_period_end
      ? Math.max(Date.parse(subscription.current_period_end), Date.now())
      : Date.now();
    update = {
      status: "active",
      plan: plan ?? subscription.plan,
      billing_period: effectivePeriod,
      current_period_end: new Date(
        base + periodDays(effectivePeriod) * 86_400_000,
      ).toISOString(),
      canceled_at: null,
    };
    if (priceCents !== undefined) update.price_cents = priceCents;
    if (couponCode !== undefined) update.coupon_code = couponCode;
    if (discountCents !== undefined) update.discount_cents = discountCents;
  } else if (action === "past_due") {
    update = { status: "past_due" };
  } else if (action === "suspend") {
    update = { status: "suspended" };
  } else {
    update = { status: "canceled", canceled_at: nowIso };
  }

  const { error: updateError } = await supabase
    .from("subscriptions")
    .update(update)
    .eq("barbershop_id", barbershopId);
  if (updateError) return { ok: false, reason: errorMessage(updateError) };

  await supabase.from("audit_logs").insert({
    barbershop_id: barbershopId,
    action: auditAction,
    entity_type: "subscription",
    entity_id: subscription.id,
    metadata: auditMetadata,
  });

  return { ok: true, subscriptionId: subscription.id as string };
}
