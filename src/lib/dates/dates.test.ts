import { describe, expect, it } from "vitest";
import {
  getLocalDateInputValue,
  getUtcDayRange,
  getUtcWeekRange,
} from "@/lib/dates";

describe("tenant date helpers", () => {
  it("converts a São Paulo calendar day to UTC", () => {
    const range = getUtcDayRange(
      "America/Sao_Paulo",
      new Date("2026-07-02T15:00:00.000Z"),
    );

    expect(range.start.toISOString()).toBe("2026-07-02T03:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-07-03T03:00:00.000Z");
  });

  it("returns the Monday-to-Monday week window in UTC", () => {
    // 2026-07-02 é uma quinta-feira; a semana começa na segunda 2026-06-29.
    const range = getUtcWeekRange(
      "America/Sao_Paulo",
      new Date("2026-07-02T15:00:00.000Z"),
    );

    expect(range.start.toISOString()).toBe("2026-06-29T03:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-07-06T03:00:00.000Z");
  });

  it("formats a date for a native date input", () => {
    expect(getLocalDateInputValue(new Date(2026, 6, 2))).toBe("2026-07-02");
  });
});

import { zonedDateTimeToUtc } from "@/lib/dates";

describe("zonedDateTimeToUtc", () => {
  it("converte hora local de São Paulo (UTC-3) para UTC", () => {
    const result = zonedDateTimeToUtc(
      "2026-07-30",
      "09:00",
      "America/Sao_Paulo",
    );
    expect(result.toISOString()).toBe("2026-07-30T12:00:00.000Z");
  });

  it("vira o dia/mês/ano na conversão", () => {
    const result = zonedDateTimeToUtc(
      "2026-12-31",
      "22:30",
      "America/Sao_Paulo",
    );
    expect(result.toISOString()).toBe("2027-01-01T01:30:00.000Z");
  });

  it("respeita horário de verão em fusos que o usam", () => {
    // Nova York: julho é EDT (UTC-4), janeiro é EST (UTC-5).
    expect(
      zonedDateTimeToUtc(
        "2026-07-15",
        "09:00",
        "America/New_York",
      ).toISOString(),
    ).toBe("2026-07-15T13:00:00.000Z");
    expect(
      zonedDateTimeToUtc(
        "2026-01-15",
        "09:00",
        "America/New_York",
      ).toISOString(),
    ).toBe("2026-01-15T14:00:00.000Z");
  });
});
