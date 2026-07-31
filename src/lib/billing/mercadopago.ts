import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Integração com o Mercado Pago (Fase 5 §5.1).
 *
 * O provedor foi escolhido por dois motivos concretos: o schema já carregava
 * `subscriptions.mp_preapproval_id` desde a Fase 2B, e é o único dos três
 * candidatos que cobra assinatura recorrente com Pix e boleto no Brasil — o
 * dono de barbearia de 2 a 8 cadeiras muitas vezes não tem cartão de crédito
 * empresarial.
 *
 * Tudo aqui é opcional em tempo de execução: sem `MERCADOPAGO_ACCESS_TOKEN` o
 * produto continua exatamente como estava, dizendo que o pagamento online não
 * está disponível. Nada quebra por falta de credencial.
 */

const API = "https://api.mercadopago.com";

export type BillingPeriod = "monthly" | "yearly";

export function mercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

function accessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurada.");
  return token;
}

/**
 * Confere a assinatura do webhook do Mercado Pago.
 *
 * O provedor manda `x-signature: ts=<epoch>,v1=<hex>` e `x-request-id`. O que
 * é assinado não é o corpo: é o manifesto
 * `id:<data.id>;request-id:<request-id>;ts:<ts>;` — por isso o `dataId` vem
 * da querystring da notificação, não do JSON.
 *
 * O timestamp entra na comparação para que uma notificação capturada não possa
 * ser reenviada dias depois (anti-replay), e a comparação é em tempo constante.
 */
export function verifyMercadoPagoSignature({
  dataId,
  requestId,
  signatureHeader,
  secret,
  toleranceSeconds = 600,
  nowMs = Date.now(),
}: {
  dataId: string | null;
  requestId: string | null;
  signatureHeader: string | null;
  secret: string;
  toleranceSeconds?: number;
  nowMs?: number;
}): { ok: true } | { ok: false; reason: string } {
  if (!signatureHeader) return { ok: false, reason: "missing_signature" };
  if (!dataId) return { ok: false, reason: "missing_data_id" };

  const parts = new Map<string, string>();
  for (const piece of signatureHeader.split(",")) {
    const [rawKey, ...rest] = piece.split("=");
    if (!rawKey || rest.length === 0) continue;
    parts.set(rawKey.trim().toLowerCase(), rest.join("=").trim());
  }

  const ts = parts.get("ts");
  const v1 = parts.get("v1");
  if (!ts || !/^\d{9,13}$/.test(ts)) return { ok: false, reason: "missing_ts" };
  if (!v1 || !/^[0-9a-f]+$/i.test(v1))
    return { ok: false, reason: "missing_v1" };

  // O Mercado Pago manda segundos; algumas contas mandam milissegundos.
  const tsMs = ts.length > 10 ? Number(ts) : Number(ts) * 1000;
  if (Math.abs(nowMs - tsMs) > toleranceSeconds * 1000) {
    return { ok: false, reason: "timestamp_out_of_tolerance" };
  }

  // O id entra em minúsculas quando é alfanumérico — é o que o provedor
  // documenta, e é o que ele assina.
  const normalizedId = /^[0-9]+$/.test(dataId) ? dataId : dataId.toLowerCase();
  const manifest = `id:${normalizedId};request-id:${requestId ?? ""};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v1.toLowerCase(), "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "signature_mismatch" };
  }
  return { ok: true };
}

/** `auto_recurring` do preapproval: mensal = 1 mês, anual = 12 meses. */
export function recurrenceFor(period: BillingPeriod): {
  frequency: number;
  frequency_type: "months";
} {
  return { frequency: period === "yearly" ? 12 : 1, frequency_type: "months" };
}

async function mpFetch<T>(
  path: string,
  init?: RequestInit & { idempotencyKey?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken()}`,
    "Content-Type": "application/json",
  };
  if (init?.idempotencyKey) headers["X-Idempotency-Key"] = init.idempotencyKey;

  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string>) },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as T | null;
  if (!response.ok) {
    const detail =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `HTTP ${response.status}`;
    throw new Error(`Mercado Pago: ${detail}`);
  }
  if (!body) throw new Error("Mercado Pago: resposta vazia.");
  return body;
}

export type PreapprovalResponse = {
  id: string;
  status: string;
  init_point?: string;
  external_reference?: string;
  auto_recurring?: { transaction_amount?: number; frequency?: number };
};

/**
 * Cria a assinatura recorrente e devolve o link de pagamento.
 *
 * `external_reference` é o id do checkout que o servidor gravou antes de
 * chamar — é por ele que o webhook descobre plano, periodicidade e valor sem
 * acreditar em nada que venha de fora.
 */
export async function createPreapproval({
  checkoutId,
  payerEmail,
  amountCents,
  period,
  reason,
  backUrl,
}: {
  checkoutId: string;
  payerEmail: string;
  amountCents: number;
  period: BillingPeriod;
  reason: string;
  backUrl: string;
}): Promise<PreapprovalResponse> {
  return mpFetch<PreapprovalResponse>("/preapproval", {
    method: "POST",
    idempotencyKey: checkoutId,
    body: JSON.stringify({
      reason,
      external_reference: checkoutId,
      payer_email: payerEmail,
      back_url: backUrl,
      status: "pending",
      auto_recurring: {
        ...recurrenceFor(period),
        transaction_amount: Number((amountCents / 100).toFixed(2)),
        currency_id: "BRL",
      },
    }),
  });
}

export async function getPreapproval(id: string): Promise<PreapprovalResponse> {
  return mpFetch<PreapprovalResponse>(`/preapproval/${encodeURIComponent(id)}`);
}

export type MpPayment = {
  id: number | string;
  status: string;
  transaction_amount?: number;
  metadata?: Record<string, unknown>;
  external_reference?: string;
  preapproval_id?: string;
};

export async function getPayment(id: string): Promise<MpPayment> {
  return mpFetch<MpPayment>(`/v1/payments/${encodeURIComponent(id)}`);
}

export async function cancelPreapproval(id: string): Promise<void> {
  await mpFetch(`/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

/**
 * Devolve a recorrência ao preço de tabela depois de uma primeira cobrança
 * com desconto. Um preapproval cobra sempre o mesmo valor — sem esta chamada,
 * um cupom de "primeira cobrança" viraria desconto vitalício.
 */
export async function updatePreapprovalAmount(
  id: string,
  amountCents: number,
): Promise<void> {
  await mpFetch(`/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      auto_recurring: {
        transaction_amount: Number((amountCents / 100).toFixed(2)),
        currency_id: "BRL",
      },
    }),
  });
}

export type BillingAction =
  | { kind: "activate" }
  | { kind: "past_due" }
  | { kind: "suspend" }
  | { kind: "cancel" }
  | { kind: "ignore" };

/**
 * Estado do preapproval → ação interna. `pending` é o estado de quem clicou e
 * ainda não pagou: não ativa e não cancela nada.
 */
export function mapPreapprovalStatus(status: string): BillingAction {
  switch (status) {
    case "authorized":
      return { kind: "activate" };
    case "paused":
      return { kind: "past_due" };
    case "cancelled":
      return { kind: "cancel" };
    default:
      return { kind: "ignore" };
  }
}

/** Estado do pagamento avulso da recorrência → ação interna. */
export function mapPaymentStatus(status: string): BillingAction {
  switch (status) {
    case "approved":
      return { kind: "activate" };
    case "rejected":
    case "cancelled":
      return { kind: "past_due" };
    case "refunded":
    case "charged_back":
      return { kind: "suspend" };
    default:
      return { kind: "ignore" };
  }
}
