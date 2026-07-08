import { describe, expect, it } from "vitest";
import { publicBookingSchema } from "@/lib/validators/entities";

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
