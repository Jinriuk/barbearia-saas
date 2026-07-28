import Link from "next/link";
import {
  Banknote,
  CalendarDays,
  CircleAlert,
  Contact,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Scissors,
  Settings,
  Sparkles,
  Store,
  UserCog,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/modules/auth/actions";
import type { TenantContext } from "@/types/domain";
import { accessState, daysLeft } from "@/lib/billing";
import { can } from "@/lib/permissions";
import { MAIN_NAV } from "@/lib/navigation";
import { PlanBadge } from "@/components/dashboard/plan-badge";
import { NotificationsBell } from "@/components/dashboard/notifications-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { NavLink } from "@/components/layout/nav-link";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";

/**
 * Ícone de cada um dos 7 destinos do §9.1 (Fase 1.14). Antes eram 15 links,
 * e quatro dos sete nomes prescritos existiam apenas como cabeçalho de grupo
 * inerte: "Financeiro" era rótulo de seção e o link real chamava-se "Resumo e
 * caixa". A lista em si mora em @/lib/navigation; as telas que saíram do menu
 * continuam alcançáveis pela faixa de seção de cada área (SectionNav).
 */
const navIcons: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard,
  "/agenda": CalendarDays,
  "/clientes": Contact,
  "/financeiro": Banknote,
  "/servicos": Scissors,
  "/profissionais": Users,
  "/configuracoes": Settings,
};

const navItems = MAIN_NAV.map((item) => ({
  ...item,
  icon: navIcons[item.href] ?? LayoutDashboard,
}));

type NavItem = (typeof navItems)[number];

// Itens fixos da barra inferior do celular (§9.2): Início, Agenda, Clientes,
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
  const visibleItems = navItems.filter(
    (item) => !item.permission || can(tenant.role, item.permission),
  );

  const mobilePrimary = mobilePrimaryHrefs
    .map((href) => visibleItems.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));

  // §9.2 — o Menu do celular tem seis itens: as áreas que não couberam na
  // barra inferior mais os três destinos que só existiam no menu do usuário
  // do cabeçalho e eram inalcançáveis no celular.
  const mobileMenuGroups = [
    {
      label: "Áreas",
      items: visibleItems
        .filter((item) => !mobilePrimaryHrefs.includes(item.href))
        .map((item) => ({
          href: item.href,
          label: item.label,
          icon: <item.icon className="size-4" />,
        })),
    },
    {
      label: "Sua conta",
      items: [
        {
          href: `/${tenant.slug}`,
          label: "Página de agendamento",
          icon: <Store className="size-4" />,
          external: true,
        },
        {
          href: "/minha-conta",
          label: "Minha conta",
          icon: <UserCog className="size-4" />,
        },
        ...(tenant.role === "owner"
          ? [
              {
                href: "/assinatura",
                label: "Meu plano NexoBarber",
                icon: <CreditCard className="size-4" />,
              },
            ]
          : []),
      ],
    },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="bg-background min-h-screen">
      {/* §9.1 pede 240px de largura no menu lateral. */}
      <aside className="bg-sidebar fixed inset-y-0 left-0 hidden w-60 border-r lg:flex lg:flex-col">
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
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {visibleItems.map((item) => (
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
      <div className="lg:pl-60">
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
          label: item.mobileLabel ?? item.label,
          icon: <item.icon className="size-5" />,
        }))}
        menuGroups={mobileMenuGroups}
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
