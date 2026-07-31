import { describe, expect, it } from "vitest";
import {
  decideNurture,
  nurture24hEmail,
  nurture72hEmail,
  type NurtureLead,
} from "./nurture";

const NOW = Date.parse("2026-07-31T12:00:00Z");
const HOUR = 3_600_000;

function lead(partial: Partial<NurtureLead> = {}): NurtureLead {
  return {
    channel: "email",
    createdAt: new Date(NOW - 30 * HOUR).toISOString(),
    funnelStage: "lead_submitted",
    convertedAt: null,
    optOutAt: null,
    nurture24hAt: null,
    nurture72hAt: null,
    ...partial,
  };
}

describe("decideNurture", () => {
  it("espera as 24 horas antes do primeiro e-mail", () => {
    expect(
      decideNurture(
        lead({ createdAt: new Date(NOW - 23 * HOUR).toISOString() }),
        NOW,
      ),
    ).toBe("none");
    expect(
      decideNurture(
        lead({ createdAt: new Date(NOW - 25 * HOUR).toISOString() }),
        NOW,
      ),
    ).toBe("nurture_24h");
  });

  it("só manda a oferta depois de 72h e depois do primeiro e-mail", () => {
    const old = new Date(NOW - 80 * HOUR).toISOString();
    // 80h de vida mas nunca contatado: recebe a de 24h primeiro, não a oferta.
    expect(decideNurture(lead({ createdAt: old }), NOW)).toBe("nurture_24h");
    expect(
      decideNurture(
        lead({
          createdAt: old,
          nurture24hAt: new Date(NOW - 50 * HOUR).toISOString(),
          funnelStage: "nurture_24h_sent",
        }),
        NOW,
      ),
    ).toBe("nurture_72h");
  });

  it("não reenvia etapa já carimbada", () => {
    expect(
      decideNurture(
        lead({
          createdAt: new Date(NOW - 200 * HOUR).toISOString(),
          nurture24hAt: new Date(NOW - 100 * HOUR).toISOString(),
          nurture72hAt: new Date(NOW - 90 * HOUR).toISOString(),
          funnelStage: "nurture_72h_sent",
        }),
        NOW,
      ),
    ).toBe("none");
  });

  it("quem virou cliente sai da régua", () => {
    expect(
      decideNurture(
        lead({ convertedAt: new Date(NOW - HOUR).toISOString() }),
        NOW,
      ),
    ).toBe("none");
    expect(decideNurture(lead({ funnelStage: "converted" }), NOW)).toBe("none");
  });

  it("quem pediu descadastro sai da régua", () => {
    expect(
      decideNurture(lead({ optOutAt: new Date(NOW).toISOString() }), NOW),
    ).toBe("none");
    expect(decideNurture(lead({ funnelStage: "opted_out" }), NOW)).toBe("none");
  });

  it("lead de WhatsApp não entra na régua de e-mail", () => {
    expect(decideNurture(lead({ channel: "whatsapp" }), NOW)).toBe("none");
  });

  it("data inválida não vira envio", () => {
    expect(decideNurture(lead({ createdAt: "não é data" }), NOW)).toBe("none");
  });
});

describe("templates", () => {
  it("o primeiro e-mail usa o primeiro nome e leva o link de descadastro", () => {
    const message = nurture24hEmail({
      name: "João da Silva",
      vertical: "barber",
      appUrl: "https://app.exemplo",
      unsubscribeUrl: "https://app.exemplo/descadastro?t=abc",
    });
    expect(message.subject).toContain("João");
    expect(message.subject).not.toContain("Silva");
    expect(message.html).toContain("https://app.exemplo/descadastro?t=abc");
    expect(message.text).toContain("Não quero mais receber");
  });

  it("a oferta carrega o cupom no assunto, no corpo e no link", () => {
    const message = nurture72hEmail({
      name: "Ana",
      vertical: "salon",
      appUrl: "https://app.exemplo",
      unsubscribeUrl: "https://app.exemplo/descadastro?t=xyz",
      couponCode: "VOLTA20",
      discountLabel: "20%",
    });
    expect(message.subject).toContain("20%");
    expect(message.html).toContain("VOLTA20");
    expect(message.html).toContain("cupom=VOLTA20");
    // A landing de salão se apresenta com outra marca (mesmo cuidado do §0.5).
    expect(message.html).toContain("NexoBeleza");
  });
});
