import { describe, expect, it } from "vitest";
import { accessState, daysLeft } from "./index";
import type { SubscriptionInfo } from "@/types/domain";

const NOW = Date.parse("2026-07-09T12:00:00Z");
const DAY = 86_400_000;

function sub(partial: Partial<SubscriptionInfo>): SubscriptionInfo {
  return {
    status: "active",
    plan: "starter",
    priceCents: 4990,
    trialEndsAt: null,
    currentPeriodEnd: null,
    ...partial,
  };
}

describe("accessState — regra 7 dias trial / +5 bloqueia / +15 cancela", () => {
  it("sem assinatura (legado) não bloqueia", () => {
    expect(accessState(null, NOW)).toBe("ok");
  });

  it("cancelada some; suspensa bloqueia", () => {
    expect(accessState(sub({ status: "canceled" }), NOW)).toBe("gone");
    expect(accessState(sub({ status: "suspended" }), NOW)).toBe("locked");
  });

  it("trial vigente ok; vencido avisa; +5d bloqueia; +15d some", () => {
    const at = (offsetDays: number) =>
      new Date(NOW - offsetDays * DAY).toISOString();
    const trial = (endOffset: number) =>
      accessState(
        sub({ status: "trialing", trialEndsAt: at(endOffset) }),
        NOW,
      );
    expect(trial(-3)).toBe("ok"); // termina em 3 dias
    expect(trial(1)).toBe("warn"); // venceu ontem
    expect(trial(6)).toBe("locked"); // venceu há 6 dias
    expect(trial(16)).toBe("gone"); // venceu há 16 dias
  });

  it("ativa vigente ok; vencida avisa; +5d bloqueia; +15d some", () => {
    const at = (offsetDays: number) =>
      new Date(NOW - offsetDays * DAY).toISOString();
    const active = (endOffset: number) =>
      accessState(
        sub({ status: "active", currentPeriodEnd: at(endOffset) }),
        NOW,
      );
    expect(active(-10)).toBe("ok");
    expect(active(2)).toBe("warn");
    expect(active(5.5)).toBe("locked");
    expect(active(15.5)).toBe("gone");
  });

  it("past_due dentro do período (gateway sinalizou falha) já avisa", () => {
    const future = new Date(NOW + 3 * DAY).toISOString();
    expect(
      accessState(sub({ status: "past_due", currentPeriodEnd: future }), NOW),
    ).toBe("warn");
  });

  it("sem data-limite não bloqueia (defensivo)", () => {
    expect(accessState(sub({ status: "trialing" }), NOW)).toBe("ok");
  });
});

describe("daysLeft", () => {
  it("conta dias e não fica negativo", () => {
    expect(daysLeft(new Date(NOW + 3 * DAY).toISOString(), NOW)).toBe(3);
    expect(daysLeft(new Date(NOW - DAY).toISOString(), NOW)).toBe(0);
    expect(daysLeft(null, NOW)).toBeNull();
  });
});
