import { cookies } from "next/headers";
import { getSessionUser, requireTenant } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PanelTheme } from "@/components/layout/panel-theme";
import { ToastProvider } from "@/components/ui/toast";
import { THEME_COOKIE, parseThemePreference } from "@/lib/theme";

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
  const cookieStore = await cookies();
  const theme = parseThemePreference(cookieStore.get(THEME_COOKIE)?.value);
  return (
    <>
      {/* Tema escolhido em Minha conta (Fase 1.1); a landing e a página de
          agendamento do cliente têm cores próprias e não seguem essa escolha. */}
      <PanelTheme preference={theme} />
      {/* Camada de aviso do §5.7 (Fase 1.7): envolve o painel inteiro para
          que os painéis laterais possam avisar depois de fechar. */}
      <ToastProvider>
        <DashboardShell
          tenant={tenant}
          isPlatformAdmin={isPlatformAdmin(user?.email)}
        >
          {children}
        </DashboardShell>
      </ToastProvider>
    </>
  );
}
