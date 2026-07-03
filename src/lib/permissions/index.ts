import type { MembershipRole } from "@/types/domain";

export type Permission =
  | "dashboard:view"
  | "appointments:manage"
  | "clients:manage"
  | "catalog:manage"
  | "inventory:manage"
  | "finance:view"
  | "reports:view"
  | "settings:manage"
  | "memberships:manage";

const permissions: Record<MembershipRole, Permission[]> = {
  owner: [
    "dashboard:view",
    "appointments:manage",
    "clients:manage",
    "catalog:manage",
    "inventory:manage",
    "finance:view",
    "reports:view",
    "settings:manage",
    "memberships:manage",
  ],
  manager: [
    "dashboard:view",
    "appointments:manage",
    "clients:manage",
    "catalog:manage",
    "inventory:manage",
    "reports:view",
  ],
  receptionist: ["dashboard:view", "appointments:manage", "clients:manage"],
  professional: ["dashboard:view"],
  client: [],
};

export function can(role: MembershipRole, permission: Permission) {
  return permissions[role].includes(permission);
}
