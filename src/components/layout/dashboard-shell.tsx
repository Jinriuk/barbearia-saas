import Link from "next/link";
import {
  Banknote,
  CalendarClock,
  CalendarDays,
  ChartNoAxesCombined,
  CircleAlert,
  Contact,
  HandCoins,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Scissors,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  Wallet,
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

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

// Navegação agrupada (Fase 1 — §6.2 do plano): as rotas existentes
// continuam, organizadas por área. A filtragem por papel é preservada.
const navGroups: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Início", icon: LayoutDashboard },
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
      {
        href: "/clientes",
        label: "Clientes",
        icon: Contact,
        permission: "clients:manage",
      },
    ],
  },
  {
    label: "Financeiro",
    items: [
      {
        href: "/financeiro",
        label: "Resumo e caixa",
        icon: Banknote,
        permission: "finance:view",
      },
      {
        href: "/contas-a-pagar",
        label: "Despesas",
        icon: ReceiptText,
        permission: "finance:view",
      },
      {
        href: "/contas-a-receber",
        label: "A receber",
        icon: HandCoins,
        permission: "finance:view",
      },
      {
        href: "/comissoes",
        label: "Comissões",
        icon: Wallet,
        permission: "finance:view",
      },
      {
        href: "/relatorios",
        label: "Relatórios",
        icon: ChartNoAxesCombined,
        permission: "reports:view",
      },
    ],
  },
  {
    label: "Serviços e produtos",
    items: [
      { href: "/servicos", label: "Serviços", icon: Scissors },
      {
        href: "/produtos",
        label: "Produtos e estoque",
        icon: ShoppingBag,
        permission: "catalog:manage",
      },
    ],
  },
  {
    label: "Equipe",
    items: [
      { href: "/profissionais", label: "Profissionais", icon: Users },
      {
        href: "/equipe/horarios",
        label: "Horários e folgas",
        icon: CalendarClock,
        permission: "appointments:manage",
      },
      {
        href: "/permissoes",
        label: "Permissões",
        icon: ShieldCheck,
        permission: "memberships:manage",
      },
    ],
  },
  {
    label: "Configurações",
    items: [
      {
        href: "/configuracoes",
        label: "Configurações",
        icon: Settings,
        permission: "settings:manage",
      },
    ],
  },
];

// Itens fixos da barra inferior do celular (§6.2): Início, Agenda, Clientes,
// Financeiro — o restante vive no botão Menu.
const mobilePrimaryHrefs = [
  "/dashboard",
  "/agenda",
  "/clientes",
  "/financeiro",
];

export function DashboardShell({
  tenant,
  isPlatformAdmin = false,
  children,
}: {
  tenant: TenantContext;
  isPlatformAdmin?: boolean;
  children: React.ReactNode;
}) {
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || can(tenant.role, item.permission),
      ),
    }))
    .filter((group) => group.items.length > 0);

  const allVisible = visibleGroups.flatMap((group) => group.items);
  const mobilePrimary = mobilePrimaryHrefs
    .map((href) => allVisible.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));
  const mobileMenuGroups = visibleGroups
    .map((group) => ({
      label: group.label,
      items: group.items.filter(
        (item) => !mobilePrimaryHrefs.includes(item.href),
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="bg-background min-h-screen">
      <aside className="bg-sidebar fixed inset-y-0 left-0 hidden w-64 border-r lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 px-5">
          <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-xl">
            <Scissors className="size-4" />
          </span>
          <span className="font-semibold tracking-tight">NexoBarber</span>
        </div>
        <div className="px-4 py-3">
          <div className="bg-card rounded-xl border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">{tenant.name}</p>
              <PlanBadge plan={tenant.plan} />
            </div>
            <p className="text-muted-foreground mt-1 text-xs">/{tenant.slug}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
          {visibleGroups.map((group, index) => (
            <div key={group.label ?? index}>
              {group.label ? (
                <p className="text-muted-foreground mb-1 px-3 text-[11px] font-semibold tracking-wide uppercase">
                  {group.label}
                </p>
              ) : null}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} href={item.href}>
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
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
                Ver página de agendamento
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
              isPlatformAdmin={isPlatformAdmin}
            />
          </div>
        </header>
        <SubscriptionBanner tenant={tenant} />
        <main className="mx-auto max-w-[1500px] p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">
          {children}
        </main>
      </div>
      <MobileTabBar
        items={mobilePrimary.map((item) => ({
          href: item.href,
          label: item.label,
          icon: <item.icon className="size-5" />,
        }))}
        menuGroups={mobileMenuGroups.map((group) => ({
          label: group.label,
          items: group.items.map((item) => ({
            href: item.href,
            label: item.label,
            icon: <item.icon className="size-4" />,
          })),
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
        className="border-warning/40 bg-warning/10 text-warning hover:bg-warning/15 flex items-center justify-center gap-2 border-b px-4 py-2 text-sm font-medium transition-colors"
      >
        <CircleAlert className="size-4" />
        Mensalidade em aberto — regularize para não perder o acesso
      </Link>
    );
  }

  return null;
}
