"use server";

import { z } from "zod";
import { requireTenant, requireUser } from "@/lib/auth/dal";
import { PLANS, type PlanKey } from "@/lib/billing";
import { loadPlanCatalog } from "@/lib/billing/catalog";
import {
  createPreapproval,
  mercadoPagoConfigured,
} from "@/lib/billing/mercadopago";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sharedRateLimit } from "@/lib/rate-limit";
import { errorMessage, logError } from "@/lib/log";

const checkoutSchema = z.object({
  plan: z.enum(["starter", "plus"]),
  period: z.enum(["monthly", "yearly"]),
  coupon: z.string().trim().max(40).optional(),
});

export type CheckoutState = {
  success: boolean;
  message: string;
  /** Para onde mandar o dono quando o gateway aceitar criar a assinatura. */
  redirectUrl?: string;
};

export type CouponPreview = {
  valid: boolean;
  message: string;
  code?: string;
  discountCents?: number;
  totalCents?: number;
};

const COUPON_REASONS: Record<string, string> = {
  NOT_FOUND: "Cupom não encontrado.",
  EXPIRED: "Este cupom não está mais valendo.",
  EXHAUSTED: "Este cupom já foi usado o número máximo de vezes.",
  NOT_APPLICABLE:
    "Este cupom não vale para o plano ou a periodicidade escolhida.",
  PRICE_NOT_FOUND: "Não consegui conferir o preço agora. Tente de novo.",
  INVALID_TARGET: "Plano ou periodicidade inválidos.",
};

/**
 * Confere um cupom para a tela, sem cobrar nada (Fase 5 §5.3).
 *
 * Passa pelo limite por sessão porque adivinhar código é a única forma de
 * descobrir cupom que não foi divulgado.
 */
export async function previewCoupon(
  plan: PlanKey,
  period: "monthly" | "yearly",
  code: string,
): Promise<CouponPreview> {
  const tenant = await requireTenant({ allowLocked: true });
  if (!(await sharedRateLimit(`coupon:${tenant.id}`, 10, 60_000))) {
    return { valid: false, message: "Muitas tentativas. Aguarde um minuto." };
  }
  const trimmed = code.trim();
  if (!trimmed) return { valid: false, message: "Digite o código." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("validate_coupon", {
      p_code: trimmed,
      p_plan: plan,
      p_period: period,
    })
    .maybeSingle();

  if (error) {
    logError("checkout.coupon_failed", { message: errorMessage(error) });
    return { valid: false, message: "Não consegui conferir o cupom agora." };
  }

  const row = data as {
    valid: boolean;
    reason: string;
    code: string | null;
    discount_cents: number;
  } | null;
  if (!row?.valid) {
    return {
      valid: false,
      message: COUPON_REASONS[row?.reason ?? ""] ?? "Cupom inválido.",
    };
  }

  const catalog = await loadPlanCatalog();
  const listPrice =
    period === "yearly"
      ? catalog[plan].yearlyCents
      : catalog[plan].monthlyCents;

  return {
    valid: true,
    message: "Cupom aplicado.",
    code: row.code ?? trimmed.toUpperCase(),
    discountCents: row.discount_cents,
    totalCents: listPrice - row.discount_cents,
  };
}

/**
 * Abre o checkout da assinatura (Fase 5 §5.1).
 *
 * A ordem importa: o servidor grava a intenção de compra em
 * `billing_checkouts` ANTES de falar com o provedor. É esse registro que o
 * webhook lê depois para saber o que foi comprado — o gateway nunca decide
 * plano nem preço, e um retorno perdido não deixa o pagamento órfão.
 */
export async function startCheckout(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const tenant = await requireTenant({ allowLocked: true });
  if (tenant.role !== "owner") {
    return { success: false, message: "Apenas o proprietário assina o plano." };
  }
  if (!mercadoPagoConfigured()) {
    return {
      success: false,
      message:
        "O pagamento online ainda não está ligado nesta instalação. Fale com o suporte.",
    };
  }
  if (!(await sharedRateLimit(`checkout:${tenant.id}`, 5, 300_000))) {
    return {
      success: false,
      message: "Muitas tentativas seguidas. Aguarde alguns minutos.",
    };
  }

  const parsed = checkoutSchema.safeParse({
    plan: formData.get("plan"),
    period: formData.get("period"),
    coupon: (formData.get("coupon") as string | null)?.trim() || undefined,
  });
  if (!parsed.success) {
    return { success: false, message: "Escolha o plano e a periodicidade." };
  }
  const { plan, period, coupon } = parsed.data;

  const catalog = await loadPlanCatalog();
  const listPriceCents =
    period === "yearly"
      ? catalog[plan].yearlyCents
      : catalog[plan].monthlyCents;

  let discountCents = 0;
  let couponCode: string | null = null;
  if (coupon) {
    const preview = await previewCoupon(plan, period, coupon);
    if (!preview.valid) return { success: false, message: preview.message };
    discountCents = preview.discountCents ?? 0;
    couponCode = preview.code ?? null;
  }

  const amountCents = listPriceCents - discountCents;
  if (amountCents < 100) {
    return { success: false, message: "Valor final inválido para cobrança." };
  }

  const admin = createSupabaseAdminClient();
  const { data: checkout, error: checkoutError } = await admin
    .from("billing_checkouts")
    .insert({
      barbershop_id: tenant.id,
      plan,
      period,
      list_price_cents: listPriceCents,
      discount_cents: discountCents,
      amount_cents: amountCents,
      coupon_code: couponCode,
      provider: "mercadopago",
    })
    .select("id")
    .single();

  if (checkoutError || !checkout) {
    logError("checkout.persist_failed", {
      message: errorMessage(checkoutError),
    });
    return { success: false, message: "Não consegui abrir o pagamento agora." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const user = await requireUser();
  try {
    const preapproval = await createPreapproval({
      checkoutId: checkout.id as string,
      payerEmail: user.email ?? "",
      amountCents,
      period,
      reason: `${PLANS[plan].label} — NexoBarber (${period === "yearly" ? "anual" : "mensal"})`,
      backUrl: `${appUrl}/assinatura?checkout=${checkout.id}`,
    });

    await admin
      .from("billing_checkouts")
      .update({
        provider_ref: preapproval.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", checkout.id);

    if (!preapproval.init_point) {
      return {
        success: false,
        message: "O provedor não devolveu o link de pagamento.",
      };
    }
    return {
      success: true,
      message: "Abrindo o pagamento…",
      redirectUrl: preapproval.init_point,
    };
  } catch (error) {
    const message = errorMessage(error);
    logError("checkout.provider_failed", { message });
    await admin
      .from("billing_checkouts")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", checkout.id);
    return {
      success: false,
      message: "O provedor de pagamento recusou a abertura. Tente de novo.",
    };
  }
}
