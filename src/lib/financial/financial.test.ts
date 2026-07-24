import { describe, expect, it } from "vitest";
import {
  formatBRL,
  PAYMENT_METHODS,
  paymentMethodLabel,
} from "@/lib/financial";

describe("paymentMethodLabel", () => {
  it("traduz os métodos conhecidos", () => {
    expect(paymentMethodLabel("cash")).toBe("Dinheiro");
    expect(paymentMethodLabel("card")).toBe("Cartão");
    expect(paymentMethodLabel("pix")).toBe("PIX");
    expect(paymentMethodLabel("other")).toBe("Outro");
  });

  it("método desconhecido ou ausente vira 'Não informado' (Fase 0)", () => {
    expect(paymentMethodLabel(null)).toBe("Não informado");
    expect(paymentMethodLabel(undefined)).toBe("Não informado");
    expect(paymentMethodLabel("")).toBe("Não informado");
    expect(paymentMethodLabel("boleto")).toBe("Não informado");
  });

  it("todos os métodos oferecidos no formulário têm rótulo", () => {
    for (const method of PAYMENT_METHODS) {
      expect(paymentMethodLabel(method.value)).toBe(method.label);
    }
  });
});

describe("formatBRL", () => {
  it("formata em reais", () => {
    expect(formatBRL(0)).toContain("0,00");
    expect(formatBRL(49.9)).toContain("49,90");
  });
});
