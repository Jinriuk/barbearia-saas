import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCheck,
  Contact,
  Scissors,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can, type Permission } from "@/lib/permissions";
import { formatTimeInTz, getUtcDayRange } from "@/lib/dates";
import { formatBRL } from "@/lib/financial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { PlanBadge } from "@/components/dashboard/plan-badge";
import { AppointmentStatusBadge } from "@/components/dashboard/appointment-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const quickLinks: Array<{
  href: string;
  label: string;
  description: string;
  icon: typeof CalendarDays;
  permission?: Permission;
}> = [
  {
    href: "/agenda",
    label: "Agenda",
    description: "Horários do dia",
    icon: CalendarDays,
  },
  {
    href: "/financeiro",
    label: "Financeiro",
    description: "Confirmar pagamentos",
    icon: Banknote,
    permission: "finance:view",
  },
  {
    href: "/relatorios",
    label: "Relatórios",
    description: "Saldos e recebimentos",
    icon: ChartNoAxesCombined,
    permission: "reports:view",
  },
  {
    href: "/clientes",
    label: "Clientes",
    description: "Base de clientes",
    icon: Contact,
    permission: "clients:manage",
  },
  {
    href: "/servicos",
    label: "Serviços",
    description: "Catálogo e preços",
    icon: Scissors,
  },
  {
    href: "/profissionais",
    label: "Equipe",
    description: "Profissionais",
    icon: Users,
  },
  {
    href: "/produtos",
    label: "Produtos",
    description: "Loja e upsell",
    icon: ShoppingBag,
    permission: "catalog:manage",
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    description: "White label",
    icon: Settings,
    permission: "settings:manage",
  },
];

export default async function DashboardPage() {
  const tenant = await requireTenant();
  const canFinance = can(tenant.role, "finance:view");
  const supabase = await createSupabaseServerClient();
  const { start: dayStart, end: dayEnd } = getUtcDayRange(tenant.timezone);

  const [appointmentsRes, financeRes] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id,starts_at,status,client:clients(name),service:services(name),professional:professionals(name)",
      )
      .eq("barbershop_id", tenant.id)
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString())
      .order("starts_at"),
    canFinance
      ? supabase
          .from("financial_transactions")
          .select("amount")
          .eq("barbershop_id", tenant.id)
          .eq("type", "income")
          .eq("status", "paid")
          .gte("paid_at", dayStart.toISOString())
          .lt("paid_at", dayEnd.toISOString())
      : Promise.resolve({ data: [] as { amount: number }[] }),
  ]);

  const appointmentRows = appointmentsRes.data ?? [];
  const paidRows = (financeRes.data ?? []) as { amount: number }[];

  const appointments = appointmentRows.map((item) => ({
    id: item.id as string,
    startsAt: item.starts_at as string,
    status: item.status as string,
    clientName: first(item.client)?.name ?? "Cliente",
    serviceName: first(item.service)?.name ?? "Serviço",
    professionalName: first(item.professional)?.name ?? "",
  }));

  const scheduled = appointments.filter((item) => item.status !== "canceled");
  const completed = scheduled.filter((item) => item.status === "completed");
  const revenueToday = paidRows.reduce(
    (total, row) => total + Number(row.amount),
    0,
  );

  const metrics = [
    canFinance
      ? {
          label: "Recebido hoje",
          value: formatBRL(revenueToday),
          icon: Wallet,
          accent: true,
        }
      : {
          label: "Atendimentos hoje",
          value: String(scheduled.length),
          icon: CalendarDays,
          accent: true,
        },
    {
      label: "Clientes agendados",
      value: String(scheduled.length),
      icon: Contact,
    },
    {
      label: "Concluídos hoje",
      value: String(completed.length),
      icon: CheckCheck,
    },
    {
      label: "Próximo horário",
      value: scheduled.length
        ? formatTimeInTz(scheduled[0].startsAt, tenant.timezone)
        : "—",
      icon: CalendarClock,
    },
  ];

  const visibleLinks = quickLinks.filter(
    (link) => !link.permission || can(tenant.role, link.permission),
  );

  return (
    <>
      <PageHeader
        eyebrow="Resumo do dia"
        title={`Olá, ${tenant.profileName.split(" ")[0]}!`}
        description="Tudo o que importa hoje, em um lugar só."
        action={<PlanBadge plan={tenant.plan} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card
            key={metric.label}
            className={metric.accent ? "border-primary/40" : undefined}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {metric.label}
              </CardTitle>
              <metric.icon className="text-primary size-4" />
            </CardHeader>
            <CardContent>
              <p className="font-mono text-2xl font-semibold sm:text-3xl">
                {metric.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Agenda de hoje</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/agenda">
              Ver agenda <ArrowRight />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {scheduled.length ? (
            scheduled.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-lg border p-3.5"
              >
                <span className="font-mono text-sm font-semibold">
                  {formatTimeInTz(item.startsAt, tenant.timezone)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.clientName}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {item.serviceName}
                    {item.professionalName ? ` · ${item.professionalName}` : ""}
                  </p>
                </div>
                <AppointmentStatusBadge status={item.status} />
              </div>
            ))
          ) : (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Nenhum horário para hoje. Compartilhe sua página de agendamento!
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold tracking-tight">
          Acesso rápido
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-card hover:border-primary/50 hover:bg-muted/40 group flex items-center gap-3 rounded-xl border p-4 transition-colors"
            >
              <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-lg">
                <link.icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{link.label}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  {link.description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
