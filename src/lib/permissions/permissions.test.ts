import { describe, expect, it } from "vitest";
import { can } from "@/lib/permissions";

describe("role permissions", () => {
  it("keeps receptionist away from finance", () => {
    expect(can("receptionist", "appointments:manage")).toBe(true);
    expect(can("receptionist", "finance:view")).toBe(false);
  });

  it("allows only owner to manage memberships", () => {
    expect(can("owner", "memberships:manage")).toBe(true);
    expect(can("manager", "memberships:manage")).toBe(false);
  });

  it("does not grant dashboard permissions to clients", () => {
    expect(can("client", "dashboard:view")).toBe(false);
  });

  it("lets professionals manage their own agenda but not finances", () => {
    expect(can("professional", "appointments:manage")).toBe(true);
    expect(can("professional", "finance:view")).toBe(false);
    expect(can("professional", "memberships:manage")).toBe(false);
  });
});
