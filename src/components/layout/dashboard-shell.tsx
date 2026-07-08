import Link from "next/link";
import {
  Banknote,
  CalendarDays,
  CircleAlert,
  Contact,
  HandCoins,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Scissors,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/modules/auth/actions";
import type { TenantContext } from "@/types/domain";
import { accessState, daysLeft } from "@/lib/billing";
import { can, type Permission } from "@/lib/permissions";
import { PlanBadge } from "@/components/dashboard/plan-badge";
import { NotificationsBell } from "@/components/dashboard/notifications-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { NavLink } from "@/components/layout/nav-link";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";

const nav: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
}> = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  {
    href: "/financeiro",
    label: "Financeiro",
    icon: Banknote,
    permission: "finance:view",
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: Contact,
    permission: "clients:manage",
  },
  { href: "/servicos", label: "Serviços", icon: Scissors },
  {
    href: "/produtos",
    label: "Produtos e Estoque",
    icon: ShoppingBag,
    permission: "catalog:manage",
  },
  { href: "/profissionais", label: "Profissionais e Equipe", icon: Users },
  {
    href: "/contas-a-pagar",
    label: "Contas a pagar",
    icon: ReceiptText,
    permission: "finance:view",
  },
  {
    href: "/contas-a-receber",
    label: "Contas a receber",
    icon: HandCoins,
    permission: "finance:view",
  },
  {
    href: "/configuracoes",
    label: "Identidade Visual",
    icon: Settings,
    permission: "settings:manage",
  },
];

export function DashboardShell({
  tenant,
  children,
}: {
  tenant: TenantContext;
  children: React.ReactNode;
}) {
  const visibleNav = nav.filter(
    (item) => !item.permission || can(tenant.role, item.permission),
  );
  return (
    <div className="bg-muted/30 min-h-screen">
      <aside className="bg-background fixed inset-y-0 left-0 hidden w-64 border-r lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 px-5">
          <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-xl">
            <Scissors className="size-4" />
          </span>
          <span className="font-semibold tracking-tight">NexoBarber</span>
        </div>
        <div className="px-4 py-3">
          <div className="bg-muted/40 rounded-xl border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">{tenant.name}</p>
              <PlanBadge plan={tenant.plan} />
            </div>
            <p className="text-muted-foreground mt-1 text-xs">/{tenant.slug}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {visibleNav.map((item) => (
            <NavLink key={item.href} href={item.href}>
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4">
          <Separator className="mb-4" />
          <form action={signOut}>
            <Button
              variant="ghost"
              className="text-muted-foreground w-full justify-start"
            >
              <LogOut className="size-4" /> Sair
            </Button>
          </form>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="bg-background/90 sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <Store className="text-primary size-5" />
            <span className="max-w-40 truncate font-medium">{tenant.name}</span>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link href={`/${tenant.slug}`} target="_blank">
                Ver página pública
              </Link>
            </Button>
            <NotificationsBell
              tenantId={tenant.id}
              timezone={tenant.timezone}
            />
            <UserMenu
              name={tenant.profileName}
              role={tenant.role}
              canManageSettings={can(tenant.role, "settings:manage")}
            />
          </div>
        </header>
        <nav
          aria-label="Navegação principal"
          className="bg-background flex gap-1 overflow-x-auto border-b px-3 py-2 lg:hidden"
        >
          {visibleNav.map((item) => (
            <NavLink key={item.href} href={item.href} size="sm">
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <SubscriptionBanner tenant={tenant} />
        <main className="mx-auto max-w-[1500px] p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">
          {children}
        </main>
      </div>
      <MobileTabBar
        items={visibleNav.slice(0, 5).map((item) => ({
          href: item.href,
          label: item.label,
          icon: <item.icon className="size-5" />,
        }))}
      />
    </div>
  );
}

/**
 * Faixa de status da assinatura, visível só para o proprietário: dias
 * restantes do teste grátis ou mensalidade em aberto. Estados bloqueados não
 * chegam aqui — o requireTenant() das páginas redireciona para /assinatura.
 */
function SubscriptionBanner({ tenant }: { tenant: TenantContext }) {
  if (tenant.role !== "owner" || !tenant.subscription) return null;
  const state = accessState(tenant.subscription);

  if (tenant.subscription.status === "trialing" && state === "ok") {
    const days = daysLeft(tenant.subscription.trialEndsAt) ?? 0;
    return (
      <Link
        href="/assinatura"
        className="bg-primary/10 text-primary hover:bg-primary/15 flex items-center justify-center gap-2 border-b px-4 py-2 text-sm font-medium transition-colors"
      >
        <Sparkles className="size-4" />
        Teste grátis: {days === 1 ? "último dia" : `${days} dias restantes`} ·
        conhecer os planos
      </Link>
    );
  }

  if (state === "warn") {
    return (
      <Link
        href="/assinatura"
        className="flex items-center justify-center gap-2 border-b bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-200/70 dark:bg-amber-950/50 dark:text-amber-200"
      >
        <CircleAlert className="size-4" />
        Mensalidade em aberto — regularize para não perder o acesso
      </Link>
    );
  }

  return null;
}
