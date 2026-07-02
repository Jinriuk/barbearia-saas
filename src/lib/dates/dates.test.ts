import { describe, expect, it } from "vitest";
import { getLocalDateInputValue, getUtcDayRange } from "@/lib/dates";

describe("tenant date helpers", () => {
  it("converts a São Paulo calendar day to UTC", () => {
    const range = getUtcDayRange(
      "America/Sao_Paulo",
      new Date("2026-07-02T15:00:00.000Z"),
    );

    expect(range.start.toISOString()).toBe("2026-07-02T03:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-07-03T03:00:00.000Z");
  });

  it("formats a date for a native date input", () => {
    expect(getLocalDateInputValue(new Date(2026, 6, 2))).toBe("2026-07-02");
  });
});
