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
  // O profissional pode gerenciar a agenda, mas a RLS o restringe aos próprios
  // atendimentos (is_own_professional), então nunca vê os de outros.
  professional: ["dashboard:view", "appointments:manage"],
  client: [],
};

export function can(role: MembershipRole, permission: Permission) {
  return permissions[role].includes(permission);
}
