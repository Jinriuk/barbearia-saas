import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verificação de assinatura do webhook de pagamentos (Fase 2B).
 * Contrato provider-agnostic: o provedor (ou o gateway intermediário) envia
 *   x-webhook-timestamp: epoch em segundos
 *   x-webhook-signature: hex de HMAC-SHA256(`${timestamp}.${corpo bruto}`)
 * Timestamp fora da tolerância é rejeitado (anti-replay). A comparação é em
 * tempo constante.
 */
export function verifyWebhookSignature({
  rawBody,
  signature,
  timestamp,
  secret,
  toleranceSeconds = 300,
  nowMs = Date.now(),
}: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  secret: string;
  toleranceSeconds?: number;
  nowMs?: number;
}): { ok: true } | { ok: false; reason: string } {
  if (!signature) return { ok: false, reason: "missing_signature" };
  if (!timestamp || !/^\d{9,12}$/.test(timestamp)) {
    return { ok: false, reason: "missing_timestamp" };
  }
  const ageSeconds = Math.abs(nowMs / 1000 - Number(timestamp));
  if (ageSeconds > toleranceSeconds) {
    return { ok: false, reason: "timestamp_out_of_tolerance" };
  }
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim().toLowerCase(), "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "signature_mismatch" };
  }
  return { ok: true };
}

export type BillingAction =
  | { kind: "activate" }
  | { kind: "past_due" }
  | { kind: "suspend" }
  | { kind: "cancel" }
  | { kind: "ignore" };

/**
 * Mapeamento EXPLÍCITO entre evento do provedor e ação interna (§8.3).
 * Evento desconhecido nunca muda assinatura — vira `ignore` e fica
 * registrado em billing_events para investigação.
 */
export function mapBillingEvent(eventType: string): BillingAction {
  switch (eventType) {
    case "payment.approved":
    case "subscription.renewed":
      return { kind: "activate" };
    case "payment.failed":
    case "payment.pending":
      return { kind: "past_due" };
    case "payment.chargeback":
      return { kind: "suspend" };
    case "subscription.canceled":
    case "payment.refunded":
      return { kind: "cancel" };
    default:
      return { kind: "ignore" };
  }
}

/** Dias de acesso comprados por periodicidade. */
export function periodDays(period: "monthly" | "yearly"): number {
  return period === "yearly" ? 365 : 30;
}
