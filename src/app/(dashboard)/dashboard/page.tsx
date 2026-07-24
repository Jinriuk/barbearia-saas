import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCheck,
  Contact,
  MessageCircle,
  Scissors,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can, type Permission } from "@/lib/permissions";
import {
  formatTimeInTz,
  getDateInTz,
  getUtcDayRange,
  getUtcMonthRange,
  getUtcNextDayRange,
  getUtcWeekRange,
} from "@/lib/dates";
import { formatBRL } from "@/lib/financial";
import { reminderMessage, reminderWhatsAppHref } from "@/lib/whatsapp";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { WelcomeConversion } from "@/components/platform/welcome-conversion";
import {
  ActivationChecklist,
  type ActivationStep,
} from "@/components/dashboard/activation-checklist";
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
    label: "Profissionais e Equipe",
    description: "Equipe e acessos",
    icon: Users,
  },
  {
    href: "/produtos",
    label: "Produtos e Estoque",
    description: "Loja, saldo e upsell",
    icon: ShoppingBag,
    permission: "catalog:manage",
  },
  {
    href: "/configuracoes",
    label: "Identidade Visual",
    description: "White label",
    icon: Settings,
    permission: "settings:manage",
  },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const justOnboarded = params.bemvindo === "1";
  const tenant = await requireTenant();
  const canFinance = can(tenant.role, "finance:view");
  const canSettings = can(tenant.role, "settings:manage");
  const supabase = await createSupabaseServerClient();
  const { start: dayStart, end: dayEnd } = getUtcDayRange(tenant.timezone);
  const { start: weekStart } = getUtcWeekRange(tenant.timezone);
  const { start: monthStart } = getUtcMonthRange(tenant.timezone);

  // Somas de receita por período vêm do banco (RPC), evitando o teto de linhas
  // do PostgREST em meses cheios. O topo do intervalo é o fim de hoje.
  const income = (from: Date) =>
    canFinance
      ? supabase.rpc("sum_paid_income", {
          p_barbershop: tenant.id,
          p_from: from.toISOString(),
          p_to: dayEnd.toISOString(),
        })
      : Promise.resolve({ data: 0 });

  // Janela de amanhã no fuso do tenant, para o card de lembretes.
  const { end: tomorrowEnd } = getUtcNextDayRange(tenant.timezone);

  const [
    appointmentsRes,
    tomorrowRes,
    dayIncome,
    weekIncome,
    monthIncome,
    summaryRes,
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id,starts_at,status,client:clients(name),service:services(name),professional:professionals(name)",
      )
      .eq("barbershop_id", tenant.id)
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString())
      .order("starts_at"),
    supabase
      .from("appointments")
      .select(
        "id,starts_at,status,client:clients(name,phone),service:services(name),professional:professionals(name)",
      )
      .eq("barbershop_id", tenant.id)
      .in("status", ["pending", "confirmed"])
      .gte("starts_at", dayEnd.toISOString())
      .lt("starts_at", tomorrowEnd.toISOString())
      .order("starts_at"),
    income(dayStart),
    income(weekStart),
    income(monthStart),
    canFinance
      ? supabase.rpc("income_summary", {
          p_barbershop: tenant.id,
          p_from: monthStart.toISOString(),
          p_to: dayEnd.toISOString(),
        })
      : Promise.resolve({ data: null }),
  ]);

  // Dashboard orientado a ação (Fase 3 §9.5): cada alerta tem um destino.
  const canClients = can(tenant.role, "clients:manage");
  const [toCallRes, pendingRes, overdueRes] = await Promise.all([
    canClients
      ? supabase.rpc("count_clients_to_call", { p_barbershop: tenant.id })
      : Promise.resolve({ data: 0 }),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("barbershop_id", tenant.id)
      .eq("status", "pending")
      .gte("starts_at", new Date().toISOString()),
    canFinance
      ? supabase
          .from("accounts_payable")
          .select("id", { count: "exact", head: true })
          .eq("barbershop_id", tenant.id)
          .eq("status", "pending")
          .lt("due_date", getDateInTz(tenant.timezone))
      : Promise.resolve({ count: 0 }),
  ]);
  const actionItems = [
    {
      label: "Clientes para chamar",
      count: Number(toCallRes.data ?? 0),
      href: "/clientes?segmento=para_chamar",
      cta: "Chamar no WhatsApp",
    },
    {
      label: "Reservas aguardando confirmação",
      count: pendingRes.count ?? 0,
      href: "/agenda?status=pending",
      cta: "Confirmar na agenda",
    },
    {
      label: "Contas vencidas",
      count: overdueRes.count ?? 0,
      href: "/contas-a-pagar",
      cta: "Ver despesas",
    },
  ].filter((item) => item.count > 0);

  // Jornada de ativação (Fase 1): derivada de dados reais — retoma sozinha.
  let activationSteps: ActivationStep[] = [];
  if (canSettings) {
    const [settingsRes, servicesRes, professionalsRes, availabilityRes] =
      await Promise.all([
        supabase
          .from("tenant_settings")
          .select("address,whatsapp_number")
          .eq("barbershop_id", tenant.id)
          .maybeSingle(),
        supabase
          .from("services")
          .select("id", { count: "exact", head: true })
          .eq("barbershop_id", tenant.id)
          .eq("active", true),
        supabase
          .from("professionals")
          .select("id", { count: "exact", head: true })
          .eq("barbershop_id", tenant.id)
          .eq("active", true),
        supabase
          .from("professional_availability")
          .select("professional_id", { count: "exact", head: true })
          .eq("barbershop_id", tenant.id)
          .eq("active", true),
      ]);
    const hasContact = Boolean(
      settingsRes.data?.address && settingsRes.data?.whatsapp_number,
    );
    const hasService = (servicesRes.count ?? 0) > 0;
    const hasProfessional = (professionalsRes.count ?? 0) > 0;
    const hasAvailability = (availabilityRes.count ?? 0) > 0;
    const basicsDone =
      hasContact && hasService && hasProfessional && hasAvailability;
    activationSteps = [
      {
        label: "Endereço e WhatsApp",
        description: "Clientes precisam saber onde e como falar com você.",
        href: "/configuracoes",
        done: hasContact,
      },
      {
        label: "Primeiro serviço",
        description: "Cadastre pelo menos um serviço com preço e duração.",
        href: "/servicos",
        done: hasService,
      },
      {
        label: "Primeiro profissional",
        description: "Quem atende aparece na página de agendamento.",
        href: "/profissionais",
        done: hasProfessional,
      },
      {
        label: "Expediente da equipe",
        description: "Os horários abertos viram os slots da página pública.",
        href: "/equipe/horarios",
        done: hasAvailability,
      },
      {
        label: "Regras de agendamento e compartilhamento",
        description:
          "Revise antecedência, horizonte e confirmação; o link e o QR Code ficam em Configurações.",
        href: "/configuracoes",
        done: basicsDone,
      },
    ];
  }

  const appointmentRows = appointmentsRes.data ?? [];

  // Lembretes de amanhã: um toque abre o WhatsApp com a mensagem pronta —
  // a secretária dispara todos em sequência.
  const reminders = (tomorrowRes.data ?? []).map((item) => {
    const clientName = first(item.client)?.name ?? "Cliente";
    const serviceName = first(item.service)?.name ?? "seu atendimento";
    return {
      id: item.id as string,
      startsAt: item.starts_at as string,
      clientName,
      serviceName,
      professionalName: first(item.professional)?.name ?? "",
      whatsappHref: reminderWhatsAppHref(
        first(item.client)?.phone,
        reminderMessage(
          { clientName, serviceName, startsAt: item.starts_at as string },
          tenant,
        ),
      ),
    };
  });

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
  const revenueToday = Number(dayIncome.data ?? 0);
  const revenueWeek = Number(weekIncome.data ?? 0);
  const revenueMonth = Number(monthIncome.data ?? 0);
  const summaryRow = Array.isArray(summaryRes.data)
    ? summaryRes.data[0]
    : summaryRes.data;
  const receivableTotal = Number(summaryRow?.receivable ?? 0);

  const revenueCards: Array<{ label: string; value: string; href?: string }> =
    canFinance
      ? [
          { label: "Recebido hoje", value: formatBRL(revenueToday) },
          { label: "Recebido na semana", value: formatBRL(revenueWeek) },
          { label: "Recebido no mês", value: formatBRL(revenueMonth) },
          {
            label: "A receber",
            value: formatBRL(receivableTotal),
            href: "/financeiro#a-receber",
          },
        ]
      : [];

  const metrics = [
    {
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
      {justOnboarded ? <WelcomeConversion /> : null}
      <PageHeader
        eyebrow="Resumo do dia"
        title={`Olá, ${tenant.profileName.split(" ")[0]}!`}
        description="Tudo o que importa hoje, em um lugar só."
        action={<PlanBadge plan={tenant.plan} />}
      />

      {activationSteps.length ? (
        <ActivationChecklist steps={activationSteps} />
      ) : null}

      {actionItems.length ? (
        <Card className="border-warning/40 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Precisa de atenção hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {actionItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="hover:border-primary/50 hover:bg-muted/40 flex min-h-12 items-center justify-between gap-3 rounded-lg border px-4 py-2.5 transition-colors"
              >
                <span className="text-sm font-medium">
                  {item.label}
                  <span className="text-warning ml-2 font-mono">
                    {item.count}
                  </span>
                </span>
                <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                  {item.cta} <ArrowRight className="size-3.5" />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {revenueCards.length ? (
        <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {revenueCards.map((card) => {
            const content = (
              <Card className="border-primary/40 h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    {card.label}
                  </CardTitle>
                  <Wallet className="text-primary size-4" />
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-2xl font-semibold sm:text-3xl">
                    {card.value}
                  </p>
                </CardContent>
              </Card>
            );
            return card.href ? (
              <Link key={card.label} href={card.href} className="block">
                {content}
              </Link>
            ) : (
              <div key={card.label}>{content}</div>
            );
          })}
        </div>
      ) : null}

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

      {reminders.length ? (
        <Card className="mt-6 border-emerald-300 dark:border-emerald-900">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
              Lembretes de amanhã
            </CardTitle>
            <span className="text-muted-foreground text-xs">
              {reminders.length}{" "}
              {reminders.length === 1 ? "horário" : "horários"}
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            {reminders.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border p-3.5"
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
                {item.whatsappHref ? (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="text-emerald-700 dark:text-emerald-400"
                  >
                    <a
                      href={item.whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="size-3.5" />
                      Lembrar no WhatsApp
                    </a>
                  </Button>
                ) : (
                  <span className="text-muted-foreground text-xs">
                    Sem telefone
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

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
