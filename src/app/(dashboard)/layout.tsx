import { getSessionUser, requireTenant } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // allowLocked aqui evita loop de redirect: o bloqueio por assinatura
  // acontece no requireTenant() de cada página, e /assinatura (dentro deste
  // layout) precisa renderizar para o dono regularizar.
  const tenant = await requireTenant({ allowLocked: true });
  const user = await getSessionUser();
  return (
    <DashboardShell
      tenant={tenant}
      isPlatformAdmin={isPlatformAdmin(user?.email)}
    >
      {children}
    </DashboardShell>
  );
}
