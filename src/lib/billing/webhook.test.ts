import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  mapBillingEvent,
  periodDays,
  verifyWebhookSignature,
} from "@/lib/billing/webhook";

const SECRET = "segredo-de-teste";

function sign(rawBody: string, timestamp: string, secret = SECRET) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
}

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ id: "evt_1", type: "payment.approved" });
  const nowMs = 1_800_000_000_000;
  const ts = String(Math.floor(nowMs / 1000));

  it("aceita assinatura válida dentro da tolerância", () => {
    expect(
      verifyWebhookSignature({
        rawBody: body,
        signature: sign(body, ts),
        timestamp: ts,
        secret: SECRET,
        nowMs,
      }),
    ).toEqual({ ok: true });
  });

  it("rejeita assinatura ausente, inválida ou de outro segredo", () => {
    expect(
      verifyWebhookSignature({
        rawBody: body,
        signature: null,
        timestamp: ts,
        secret: SECRET,
        nowMs,
      }).ok,
    ).toBe(false);
    expect(
      verifyWebhookSignature({
        rawBody: body,
        signature: "deadbeef",
        timestamp: ts,
        secret: SECRET,
        nowMs,
      }).ok,
    ).toBe(false);
    expect(
      verifyWebhookSignature({
        rawBody: body,
        signature: sign(body, ts, "outro-segredo"),
        timestamp: ts,
        secret: SECRET,
        nowMs,
      }).ok,
    ).toBe(false);
  });

  it("rejeita corpo adulterado após assinar", () => {
    expect(
      verifyWebhookSignature({
        rawBody: body.replace("payment.approved", "subscription.canceled"),
        signature: sign(body, ts),
        timestamp: ts,
        secret: SECRET,
        nowMs,
      }).ok,
    ).toBe(false);
  });

  it("rejeita timestamp fora da tolerância (anti-replay)", () => {
    const old = String(Math.floor(nowMs / 1000) - 3600);
    const result = verifyWebhookSignature({
      rawBody: body,
      signature: sign(body, old),
      timestamp: old,
      secret: SECRET,
      nowMs,
    });
    expect(result).toEqual({
      ok: false,
      reason: "timestamp_out_of_tolerance",
    });
  });
});

describe("mapBillingEvent", () => {
  it("mapeia eventos conhecidos explicitamente", () => {
    expect(mapBillingEvent("payment.approved").kind).toBe("activate");
    expect(mapBillingEvent("subscription.renewed").kind).toBe("activate");
    expect(mapBillingEvent("payment.failed").kind).toBe("past_due");
    expect(mapBillingEvent("payment.chargeback").kind).toBe("suspend");
    expect(mapBillingEvent("subscription.canceled").kind).toBe("cancel");
    expect(mapBillingEvent("payment.refunded").kind).toBe("cancel");
  });

  it("evento desconhecido nunca muda assinatura", () => {
    expect(mapBillingEvent("algo.novo").kind).toBe("ignore");
  });
});

describe("periodDays", () => {
  it("mensal = 30 dias, anual = 365 dias", () => {
    expect(periodDays("monthly")).toBe(30);
    expect(periodDays("yearly")).toBe(365);
  });
});
