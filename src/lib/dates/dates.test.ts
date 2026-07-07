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
