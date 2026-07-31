import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  mapPaymentStatus,
  mapPreapprovalStatus,
  recurrenceFor,
  verifyMercadoPagoSignature,
} from "./mercadopago";

const SECRET = "segredo-do-webhook";
const NOW = Date.parse("2026-07-31T12:00:00Z");

function sign({
  dataId,
  requestId,
  ts,
  secret = SECRET,
}: {
  dataId: string;
  requestId: string;
  ts: number;
  secret?: string;
}) {
  const normalized = /^[0-9]+$/.test(dataId) ? dataId : dataId.toLowerCase();
  const manifest = `id:${normalized};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

describe("verifyMercadoPagoSignature", () => {
  const ts = Math.floor(NOW / 1000);

  it("aceita a notificação legítima", () => {
    const header = sign({ dataId: "123456", requestId: "req-1", ts });
    expect(
      verifyMercadoPagoSignature({
        dataId: "123456",
        requestId: "req-1",
        signatureHeader: header,
        secret: SECRET,
        nowMs: NOW,
      }),
    ).toEqual({ ok: true });
  });

  it("recusa assinatura feita com outro segredo", () => {
    const header = sign({
      dataId: "123456",
      requestId: "req-1",
      ts,
      secret: "outro",
    });
    const verdict = verifyMercadoPagoSignature({
      dataId: "123456",
      requestId: "req-1",
      signatureHeader: header,
      secret: SECRET,
      nowMs: NOW,
    });
    expect(verdict).toEqual({ ok: false, reason: "signature_mismatch" });
  });

  it("recusa quando o id do recurso é trocado — o manifesto inclui o id", () => {
    const header = sign({ dataId: "123456", requestId: "req-1", ts });
    const verdict = verifyMercadoPagoSignature({
      dataId: "999999",
      requestId: "req-1",
      signatureHeader: header,
      secret: SECRET,
      nowMs: NOW,
    });
    expect(verdict).toEqual({ ok: false, reason: "signature_mismatch" });
  });

  it("recusa notificação antiga (replay)", () => {
    const oldTs = ts - 3600;
    const header = sign({ dataId: "123456", requestId: "req-1", ts: oldTs });
    const verdict = verifyMercadoPagoSignature({
      dataId: "123456",
      requestId: "req-1",
      signatureHeader: header,
      secret: SECRET,
      nowMs: NOW,
    });
    expect(verdict).toEqual({
      ok: false,
      reason: "timestamp_out_of_tolerance",
    });
  });

  it("recusa sem cabeçalho de assinatura e sem id", () => {
    expect(
      verifyMercadoPagoSignature({
        dataId: "1",
        requestId: "r",
        signatureHeader: null,
        secret: SECRET,
        nowMs: NOW,
      }),
    ).toEqual({ ok: false, reason: "missing_signature" });

    expect(
      verifyMercadoPagoSignature({
        dataId: null,
        requestId: "r",
        signatureHeader: sign({ dataId: "1", requestId: "r", ts }),
        secret: SECRET,
        nowMs: NOW,
      }),
    ).toEqual({ ok: false, reason: "missing_data_id" });
  });

  it("normaliza id alfanumérico para minúsculas, como o provedor assina", () => {
    const header = sign({ dataId: "ABC-Def", requestId: "req-1", ts });
    expect(
      verifyMercadoPagoSignature({
        dataId: "ABC-Def",
        requestId: "req-1",
        signatureHeader: header,
        secret: SECRET,
        nowMs: NOW,
      }),
    ).toEqual({ ok: true });
  });
});

describe("mapeamento de estados", () => {
  it("só authorized ativa; pending não mexe em nada", () => {
    expect(mapPreapprovalStatus("authorized")).toEqual({ kind: "activate" });
    expect(mapPreapprovalStatus("paused")).toEqual({ kind: "past_due" });
    expect(mapPreapprovalStatus("cancelled")).toEqual({ kind: "cancel" });
    expect(mapPreapprovalStatus("pending")).toEqual({ kind: "ignore" });
    expect(mapPreapprovalStatus("qualquer_coisa")).toEqual({ kind: "ignore" });
  });

  it("estorno suspende, recusa vira pagamento pendente", () => {
    expect(mapPaymentStatus("approved")).toEqual({ kind: "activate" });
    expect(mapPaymentStatus("rejected")).toEqual({ kind: "past_due" });
    expect(mapPaymentStatus("charged_back")).toEqual({ kind: "suspend" });
    expect(mapPaymentStatus("refunded")).toEqual({ kind: "suspend" });
    expect(mapPaymentStatus("in_process")).toEqual({ kind: "ignore" });
  });
});

describe("recorrência", () => {
  it("anual é 12 meses, não 1 ano — é o que o provedor entende", () => {
    expect(recurrenceFor("yearly")).toEqual({
      frequency: 12,
      frequency_type: "months",
    });
    expect(recurrenceFor("monthly")).toEqual({
      frequency: 1,
      frequency_type: "months",
    });
  });
});
