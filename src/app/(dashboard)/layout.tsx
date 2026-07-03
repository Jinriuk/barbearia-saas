import { requireTenant } from "@/lib/auth/dal";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await requireTenant();
  return <DashboardShell tenant={tenant}>{children}</DashboardShell>;
}
