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
});
