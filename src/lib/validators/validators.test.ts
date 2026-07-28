import { describe, expect, it } from "vitest";
import {
  publicBookingSchema,
  publicClientLookupSchema,
  publicRescheduleSchema,
} from "@/lib/validators/entities";

const base = {
  professionalId: "11111111-1111-4111-8111-111111111111",
  serviceId: "22222222-2222-4222-9222-222222222222",
  clientName: "João Silva",
  clientPhone: "11987654321",
};

describe("publicBookingSchema", () => {
  it("accepts the timestamptz offset format returned by Postgres/PostgREST", () => {
    // Formato real devolvido pela disponibilidade — costumava causar 400.
    const parsed = publicBookingSchema.safeParse({
      ...base,
      startsAt: "2026-07-08T13:00:00+00:00",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts UTC 'Z' timestamps", () => {
    const parsed = publicBookingSchema.safeParse({
      ...base,
      startsAt: "2026-07-08T13:00:00Z",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a payload without a valid datetime", () => {
    const parsed = publicBookingSchema.safeParse({
      ...base,
      startsAt: "amanhã de manhã",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("etapa de pagamento (Fase 4)", () => {
  it("aceita as formas oferecidas ao cliente final", () => {
    for (const method of ["pix", "card", "cash", "other"]) {
      const parsed = publicBookingSchema.safeParse({
        ...base,
        startsAt: "2026-07-08T13:00:00Z",
        paymentPreference: method,
      });
      expect(parsed.success, method).toBe(true);
    }
  });

  it('aceita vazio — "decido na hora" é uma resposta válida', () => {
    const parsed = publicBookingSchema.safeParse({
      ...base,
      startsAt: "2026-07-08T13:00:00Z",
      paymentPreference: "",
    });
    expect(parsed.success).toBe(true);
  });

  it("recusa forma inventada em vez de gravar lixo no banco", () => {
    const parsed = publicBookingSchema.safeParse({
      ...base,
      startsAt: "2026-07-08T13:00:00Z",
      paymentPreference: "boleto",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("reconhecimento de cliente recorrente", () => {
  it("normaliza o telefone digitado com máscara", () => {
    const parsed = publicClientLookupSchema.safeParse({
      phone: "(11) 98765-4321",
    });
    expect(parsed.success && parsed.data.phone).toBe("11987654321");
  });

  it("exige o nacional completo — número curto viraria varredura da base", () => {
    expect(publicClientLookupSchema.safeParse({ phone: "98765" }).success).toBe(
      false,
    );
  });
});

describe("remarcação pelo cliente", () => {
  const token = "a".repeat(24);

  it("aceita token no formato do banco e horário com offset", () => {
    const parsed = publicRescheduleSchema.safeParse({
      token,
      startsAt: "2026-07-08T13:00:00+00:00",
    });
    expect(parsed.success).toBe(true);
  });

  it("recusa token fora do formato", () => {
    const parsed = publicRescheduleSchema.safeParse({
      token: "curto",
      startsAt: "2026-07-08T13:00:00Z",
    });
    expect(parsed.success).toBe(false);
  });
});
