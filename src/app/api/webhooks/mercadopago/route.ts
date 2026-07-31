import {
  cancelPreapproval,
  getPayment,
  getPreapproval,
  mapPaymentStatus,
  mapPreapprovalStatus,
  updatePreapprovalAmount,
  verifyMercadoPagoSignature,
  type BillingAction,
} from "@/lib/billing/mercadopago";
import { applySubscriptionAction } from "@/lib/billing/apply";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { errorMessage, logError, logInfo } from "@/lib/log";

export const dynamic = "force-dynamic";

/**
 * Webhook do Mercado Pago (Fase 5 §5.1).
 *
 * Três regras que valem mais que o código:
 *
 * 1. O corpo da notificação NÃO é fonte de verdade. Ele traz um id; o estado
 *    vem de uma consulta à API do provedor com o nosso token. Notificação
 *    forjada com assinatura válida (chave vazada) ainda assim não inventa
 *    pagamento.
 * 2. Plano, periodicidade e valor vêm de `billing_checkouts`, gravado pelo
 *    servidor antes de o dono sair para o gateway. O provedor não decide o
 *    que foi comprado.
 * 3. Idempotência pelo id da notificação em `billing_events`: reenvio não
 *    estende período duas vezes.
 */
export async function POST(request: Request) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret || !process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return Response.json(
      { error: "Webhook não configurado." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const rawBody = await request.text();
  let body: {
    id?: number | string;
    type?: string;
    topic?: string;
    action?: string;
    data?: { id?: string | number };
  } = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return Response.json({ error: "Corpo inválido." }, { status: 400 });
  }

  // O id assinado é o da querystring quando ela existe — é assim que o
  // provedor monta o manifesto nas notificações que ele mesmo reenvia.
  const dataId =
    url.searchParams.get("data.id") ??
    url.searchParams.get("id") ??
    (body.data?.id !== undefined ? String(body.data.id) : null);

  const verdict = verifyMercadoPagoSignature({
    dataId,
    requestId: request.headers.get("x-request-id"),
    signatureHeader: request.headers.get("x-signature"),
    secret,
  });
  if (!verdict.ok) {
    logError("webhook.mp.rejected", { reason: verdict.reason });
    return Response.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  const topic = body.type ?? body.topic ?? url.searchParams.get("type") ?? "";
  const notificationId = String(
    body.id ??
      `${topic}:${dataId}:${request.headers.get("x-request-id") ?? ""}`,
  );

  const supabase = createSupabaseAdminClient();

  const { data: inserted, error: insertError } = await supabase
    .from("billing_events")
    .insert({
      provider: "mercadopago",
      provider_event_id: notificationId,
      event_type: `${topic}${body.action ? `:${body.action}` : ""}`,
      payload: { topic, data_id: dataId, action: body.action ?? null },
    })
    .select("id")
    .maybeSingle();
  if (insertError) {
    if (insertError.code === "23505") {
      return Response.json({ received: true, duplicate: true });
    }
    logError("webhook.mp.persist_failed", {
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

  if (!dataId) {
    await finish("ignored");
    return Response.json({ received: true, ignored: true });
  }

  try {
    if (topic === "preapproval" || topic === "subscription_preapproval") {
      const preapproval = await getPreapproval(dataId);
      const result = await handlePreapproval(supabase, {
        preapprovalId: preapproval.id,
        status: preapproval.status,
        externalReference: preapproval.external_reference ?? null,
        amountCents: Math.round(
          (preapproval.auto_recurring?.transaction_amount ?? 0) * 100,
        ),
        notificationId,
      });
      await finish(result.status, result.error);
      return Response.json({ received: true, action: result.action });
    }

    if (topic === "payment") {
      const payment = await getPayment(dataId);
      const action = mapPaymentStatus(payment.status);
      if (action.kind === "ignore") {
        await finish("ignored");
        return Response.json({ received: true, ignored: true });
      }
      const preapprovalId =
        payment.preapproval_id ??
        (typeof payment.metadata?.preapproval_id === "string"
          ? payment.metadata.preapproval_id
          : null);
      if (!preapprovalId) {
        // Pagamento avulso sem assinatura vinculada não é do SaaS.
        await finish("ignored");
        return Response.json({ received: true, ignored: true });
      }
      const result = await handleRecurringPayment(supabase, {
        preapprovalId,
        action,
        notificationId,
      });
      await finish(result.status, result.error);
      return Response.json({ received: true, action: result.action });
    }

    await finish("ignored");
    return Response.json({ received: true, ignored: true });
  } catch (error) {
    const message = errorMessage(error);
    logError("webhook.mp.failed", { message, topic });
    await finish("failed", message);
    // 500 para o provedor reenviar: a falha aqui costuma ser rede.
    return Response.json({ error: "Falha ao processar." }, { status: 500 });
  }
}

type Outcome = {
  status: "processed" | "ignored" | "failed";
  action: string;
  error?: string;
};

/** Primeira autorização (ou cancelamento) de uma assinatura recorrente. */
async function handlePreapproval(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  {
    preapprovalId,
    status,
    externalReference,
    amountCents,
    notificationId,
  }: {
    preapprovalId: string;
    status: string;
    externalReference: string | null;
    amountCents: number;
    notificationId: string;
  },
): Promise<Outcome> {
  const action = mapPreapprovalStatus(status);
  if (action.kind === "ignore") {
    return { status: "ignored", action: "ignore" };
  }

  const { data: checkout } = externalReference
    ? await supabase
        .from("billing_checkouts")
        .select(
          "id,barbershop_id,plan,period,list_price_cents,discount_cents,amount_cents,coupon_code,status",
        )
        .eq("id", externalReference)
        .maybeSingle()
    : { data: null };

  if (!checkout) {
    // Sem checkout não dá para saber o que foi comprado. Nunca ativar no
    // escuro — mas um cancelamento a gente respeita pela assinatura.
    if (action.kind === "cancel") {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("barbershop_id")
        .eq("mp_preapproval_id", preapprovalId)
        .maybeSingle();
      if (!sub)
        return {
          status: "failed",
          action: "cancel",
          error: "CHECKOUT_NOT_FOUND",
        };
      await applySubscriptionAction(supabase, {
        barbershopId: sub.barbershop_id as string,
        action: "cancel",
        auditAction: "billing.canceled",
        auditMetadata: {
          provider: "mercadopago",
          notificationId,
          preapprovalId,
        },
      });
      return { status: "processed", action: "cancel" };
    }
    return {
      status: "failed",
      action: action.kind,
      error: "CHECKOUT_NOT_FOUND",
    };
  }

  if (action.kind !== "activate") {
    await applySubscriptionAction(supabase, {
      barbershopId: checkout.barbershop_id as string,
      action: action.kind,
      auditAction:
        action.kind === "cancel"
          ? "billing.canceled"
          : "billing.payment_failed",
      auditMetadata: { provider: "mercadopago", notificationId, preapprovalId },
    });
    // Só o cancelamento mata o checkout. Assinatura pausada (past_due) volta a
    // ser autorizada quando o cartão passa — marcar o checkout como cancelado
    // aqui faria o retorno cair em CHECKOUT_NOT_FOUND e não reativar ninguém.
    if (action.kind === "cancel") {
      await supabase
        .from("billing_checkouts")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("id", checkout.id);
    }
    return { status: "processed", action: action.kind };
  }

  // Idempotência de negócio, não só de notificação. O provedor manda uma
  // notificação NOVA (id novo, que passa limpo pelo unique de billing_events) a
  // cada atualização do preapproval, e `authorized` → `pausado` → `authorized`
  // acontece de verdade quando o cartão do dono falha e depois passa. Sem esta
  // trava, a segunda notificação compraria mais um ano de graça.
  //
  // O preapproval ativa uma vez só, na contratação. Quem estende período dali
  // em diante é a notificação de `payment` — dinheiro que entrou, não estado
  // que mudou —, e ela é idempotente pelo id do próprio pagamento.
  if (checkout.status === "authorized") {
    return { status: "ignored", action: "activate" };
  }

  // O provedor precisa estar cobrando exatamente o que este checkout gravou.
  if (amountCents > 0 && amountCents !== checkout.amount_cents) {
    return { status: "failed", action: "activate", error: "AMOUNT_MISMATCH" };
  }

  const applied = await applySubscriptionAction(supabase, {
    barbershopId: checkout.barbershop_id as string,
    action: "activate",
    plan: checkout.plan as string,
    period: checkout.period as "monthly" | "yearly",
    priceCents: checkout.list_price_cents as number,
    couponCode: (checkout.coupon_code as string | null) ?? null,
    discountCents: checkout.discount_cents as number,
    auditAction: "billing.payment_approved",
    auditMetadata: {
      provider: "mercadopago",
      notificationId,
      preapprovalId,
      checkoutId: checkout.id,
    },
  });
  if (!applied.ok) {
    return { status: "failed", action: "activate", error: applied.reason };
  }

  await supabase
    .from("subscriptions")
    .update({ mp_preapproval_id: preapprovalId })
    .eq("barbershop_id", checkout.barbershop_id);

  await supabase
    .from("billing_checkouts")
    .update({
      status: "authorized",
      provider_ref: preapprovalId,
      authorized_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", checkout.id);

  if (checkout.coupon_code) {
    await supabase.rpc("redeem_coupon", {
      p_code: checkout.coupon_code,
      p_barbershop: checkout.barbershop_id,
      p_plan: checkout.plan,
      p_period: checkout.period,
      p_discount_cents: checkout.discount_cents,
    });
    // O desconto valeu a primeira cobrança; a recorrência volta ao preço de
    // tabela. Sem isso o cupom viraria desconto vitalício por descuido.
    if ((checkout.discount_cents as number) > 0) {
      try {
        await updatePreapprovalAmount(
          preapprovalId,
          checkout.list_price_cents as number,
        );
        await supabase
          .from("subscriptions")
          .update({ discount_cents: 0 })
          .eq("barbershop_id", checkout.barbershop_id);
      } catch (error) {
        // Não derruba a ativação: o dono já pagou. Fica registrado para o
        // super-admin ajustar o valor na mão.
        logError("webhook.mp.restore_price_failed", {
          message: errorMessage(error),
          preapprovalId,
        });
      }
    }
  }

  logInfo("webhook.mp.activated", {
    plan: String(checkout.plan),
    period: String(checkout.period),
  });
  return { status: "processed", action: "activate" };
}

/** Cobranças seguintes da mesma assinatura. */
async function handleRecurringPayment(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  {
    preapprovalId,
    action,
    notificationId,
  }: {
    preapprovalId: string;
    action: BillingAction;
    notificationId: string;
  },
): Promise<Outcome> {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("barbershop_id,plan,billing_period")
    .eq("mp_preapproval_id", preapprovalId)
    .maybeSingle();
  if (!subscription) {
    return {
      status: "failed",
      action: action.kind,
      error: "SUBSCRIPTION_NOT_FOUND",
    };
  }
  if (action.kind === "ignore") return { status: "ignored", action: "ignore" };

  const applied = await applySubscriptionAction(supabase, {
    barbershopId: subscription.barbershop_id as string,
    action: action.kind,
    plan: subscription.plan as string,
    period: (subscription.billing_period as "monthly" | "yearly") ?? "monthly",
    auditAction:
      action.kind === "activate"
        ? "billing.payment_approved"
        : action.kind === "suspend"
          ? "billing.chargeback"
          : "billing.payment_failed",
    auditMetadata: { provider: "mercadopago", notificationId, preapprovalId },
  });
  if (!applied.ok) {
    return { status: "failed", action: action.kind, error: applied.reason };
  }

  // Estorno derruba a assinatura no provedor também, senão ele continua
  // cobrando quem o sistema já bloqueou.
  if (action.kind === "suspend") {
    try {
      await cancelPreapproval(preapprovalId);
    } catch (error) {
      logError("webhook.mp.cancel_failed", { message: errorMessage(error) });
    }
  }

  return { status: "processed", action: action.kind };
}
