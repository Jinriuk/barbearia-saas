import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CircleAlert,
  ExternalLink,
  MessageCircle,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import {
  currentEpochMs,
  formatDateKey,
  formatTimeInTz,
  getDateInTz,
  getUtcDayRange,
  getUtcMonthRange,
  getUtcNextDayRange,
} from "@/lib/dates";
import { formatBRL } from "@/lib/financial";
import {
  reminderMessage,
  reminderWhatsAppHref,
  returnMessage,
} from "@/lib/whatsapp";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { WelcomeConversion } from "@/components/platform/welcome-conversion";
import {
  ActivationChecklist,
  type ActivationStep,
} from "@/components/dashboard/activation-checklist";
import { PlanBadge } from "@/components/dashboard/plan-badge";
import { AppointmentStatusBadge } from "@/components/dashboard/appointment-status-badge";
import { ManualAppointmentSheet } from "@/components/dashboard/manual-appointment-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const DAY_MS = 86_400_000;

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
  const canClients = can(tenant.role, "clients:manage");
  const canCatalog = can(tenant.role, "catalog:manage");
  const canSchedule =
    tenant.role === "owner" ||
    tenant.role === "manager" ||
    tenant.role === "receptionist";
  const supabase = await createSupabaseServerClient();
  const { start: dayStart, end: dayEnd } = getUtcDayRange(tenant.timezone);
  const { start: monthStart } = getUtcMonthRange(tenant.timezone);
  const { end: tomorrowEnd } = getUtcNextDayRange(tenant.timezone);
  const todayInTz = getDateInTz(tenant.timezone);
  const yesterdayStart = new Date(dayStart.getTime() - DAY_MS);

  const income = (from: Date, to: Date) =>
    canFinance
      ? supabase.rpc("sum_paid_income", {
          p_barbershop: tenant.id,
          p_from: from.toISOString(),
          p_to: to.toISOString(),
        })
      : Promise.resolve({ data: 0 });

  const [
    appointmentsRes,
    tomorrowRes,
    dayIncome,
    yesterdayIncome,
    summaryRes,
    receivableCountRes,
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id,starts_at,status,client:clients(id,name),service:services(name),professional:professionals(name)",
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
    income(dayStart, dayEnd),
    income(yesterdayStart, dayStart),
    canFinance
      ? supabase.rpc("income_summary", {
          p_barbershop: tenant.id,
          p_from: monthStart.toISOString(),
          p_to: dayEnd.toISOString(),
        })
      : Promise.resolve({ data: null }),
    canFinance
      ? supabase
          .from("financial_transactions")
          .select("id", { count: "exact", head: true })
          .eq("barbershop_id", tenant.id)
          .eq("type", "income")
          .in("status", ["pending", "overdue"])
      : Promise.resolve({ count: 0 }),
  ]);

  // ── Bloco "Precisa da sua atenção" (§7.1.3): cinco tipos, cada um com
  //    destino. Estoque baixo e planos vencendo entram agora.
  const [
    toCallRes,
    pendingRes,
    overdueRes,
    membershipRes,
    stockRes,
    productRes,
  ] = await Promise.all([
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
          .lt("due_date", todayInTz)
      : Promise.resolve({ count: 0 }),
    canClients
      ? supabase.rpc("count_memberships_attention", {
          p_barbershop: tenant.id,
          p_days: 7,
        })
      : Promise.resolve({ data: null }),
    canCatalog
      ? supabase.rpc("get_product_stock", { p_barbershop: tenant.id })
      : Promise.resolve({ data: null }),
    canCatalog
      ? supabase
          .from("products")
          .select("id,minimum_stock")
          .eq("barbershop_id", tenant.id)
          .eq("active", true)
      : Promise.resolve({ data: null }),
  ]);

  const stockByProduct = new Map<string, number>(
    (
      (stockRes.data ?? []) as Array<{ product_id: string; balance: number }>
    ).map((row) => [row.product_id, Number(row.balance)]),
  );
  const lowStockCount = (
    (productRes.data ?? []) as Array<{ id: string; minimum_stock: number }>
  ).filter(
    (product) =>
      Number(product.minimum_stock) > 0 &&
      (stockByProduct.get(product.id) ?? 0) < Number(product.minimum_stock),
  ).length;

  const membershipRow = Array.isArray(membershipRes.data)
    ? membershipRes.data[0]
    : membershipRes.data;
  const membershipsDueSoon = Number(
    (membershipRow as { due_soon?: number } | null)?.due_soon ?? 0,
  );
  const membershipsPastDue = Number(
    (membershipRow as { past_due?: number } | null)?.past_due ?? 0,
  );

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
      label: "Planos vencendo ou vencidos",
      count: membershipsDueSoon + membershipsPastDue,
      href: "/clientes?segmento=inadimplentes",
      cta: "Cobrar assinantes",
    },
    {
      label: "Produtos abaixo do estoque mínimo",
      count: lowStockCount,
      href: "/produtos",
      cta: "Repor estoque",
    },
    {
      label: "Contas vencidas",
      count: overdueRes.count ?? 0,
      href: "/contas-a-pagar",
      cta: "Ver despesas",
    },
  ].filter((item) => item.count > 0);

  // Clientes para chamar, com o texto pronto (§7.1.5).
  const { data: toCallListData } = canClients
    ? await supabase.rpc("get_client_insights", {
        p_barbershop: tenant.id,
        p_segment: "para_chamar",
        p_search: null,
        p_limit: 4,
        p_offset: 0,
        p_client_id: null,
      })
    : { data: null };
  const businessTerm =
    tenant.vertical === "salon"
      ? `o salão ${tenant.name}`
      : `a barbearia ${tenant.name}`;
  const clientsToCall = (
    (toCallListData ?? []) as Array<{
      id: string;
      name: string;
      phone: string;
      days_since: number | null;
      top_service: string | null;
      top_professional: string | null;
    }>
  ).map((row) => ({
    id: row.id,
    name: row.name,
    daysSince: row.days_since,
    topService: row.top_service,
    whatsappHref: reminderWhatsAppHref(
      row.phone,
      returnMessage({
        clientName: row.name,
        topService: row.top_service,
        topProfessional: row.top_professional,
        businessTerm,
      }),
    ),
  }));

  // Insumos do "+ Novo" do cabeçalho (§7.1.1).
  const [{ data: serviceData }, { data: linkData }, { data: clientData }] =
    canSchedule
      ? await Promise.all([
          supabase
            .from("services")
            .select("id,name,duration_minutes")
            .eq("barbershop_id", tenant.id)
            .eq("active", true)
            .order("name"),
          supabase
            .from("professional_services")
            .select("professional_id,service_id")
            .eq("barbershop_id", tenant.id),
          supabase
            .from("clients")
            .select("id,name,phone")
            .eq("barbershop_id", tenant.id)
            .eq("active", true)
            .order("name")
            .limit(300),
        ])
      : [{ data: null }, { data: null }, { data: null }];
  const serviceIdsByProfessional = new Map<string, string[]>();
  for (const link of linkData ?? []) {
    const list = serviceIdsByProfessional.get(link.professional_id) ?? [];
    list.push(link.service_id);
    serviceIdsByProfessional.set(link.professional_id, list);
  }
  const { data: professionalData } = canSchedule
    ? await supabase
        .from("professionals")
        .select("id,name")
        .eq("barbershop_id", tenant.id)
        .eq("active", true)
        .eq("public_visible", true)
        .order("name")
    : { data: null };

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

  const appointments = (appointmentsRes.data ?? []).map((item) => ({
    id: item.id as string,
    startsAt: item.starts_at as string,
    status: item.status as string,
    clientId: first(item.client)?.id ?? null,
    clientName: first(item.client)?.name ?? "Cliente",
    serviceName: first(item.service)?.name ?? "Serviço",
    professionalName: first(item.professional)?.name ?? "",
  }));

  // Atendimento do dia é o que segue de pé: cancelado e FALTA não contam.
  // A contagem antiga incluía faltas e inflava o dia.
  const scheduled = appointments.filter(
    (item) => item.status !== "canceled" && item.status !== "no_show",
  );
  const completed = scheduled.filter((item) => item.status === "completed");
  const nowMs = currentEpochMs();
  // "Próximo horário" é o próximo de verdade — o de antes mostrava o
  // primeiro do dia mesmo às 18h.
  const nextAppointment = scheduled.find(
    (item) =>
      Date.parse(item.startsAt) >= nowMs &&
      (item.status === "pending" ||
        item.status === "confirmed" ||
        item.status === "in_progress"),
  );

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

  const revenueToday = Number(dayIncome.data ?? 0);
  const revenueYesterday = Number(yesterdayIncome.data ?? 0);
  const summaryRow = Array.isArray(summaryRes.data)
    ? summaryRes.data[0]
    : summaryRes.data;
  const soldMonth = Number(summaryRow?.sold ?? 0);
  const expensesMonth = Number(summaryRow?.expenses_paid ?? 0);
  const profitMonth = Number(summaryRow?.profit ?? 0);
  const receivableTotal = Number(summaryRow?.receivable ?? 0);
  const receivableCount = receivableCountRes.count ?? 0;
  const pendingCount = actionItems.reduce(
    (total, item) => total + item.count,
    0,
  );

  const deltaToday = revenueToday - revenueYesterday;

  // EXATAMENTE quatro indicadores (§7.1.2), cada um com período e comparação.
  const metrics: Array<{
    label: string;
    value: string;
    hint: string;
    trend?: "up" | "down" | "flat";
    href?: string;
  }> = [
    ...(canFinance
      ? [
          {
            label: "Dinheiro recebido hoje",
            value: formatBRL(revenueToday),
            hint:
              revenueYesterday > 0
                ? `${deltaToday >= 0 ? "+" : "−"}${formatBRL(Math.abs(deltaToday))} em relação a ontem`
                : "Ontem não houve recebimento",
            trend: (deltaToday > 0
              ? "up"
              : deltaToday < 0
                ? "down"
                : "flat") as "up" | "down" | "flat",
            href: "/financeiro",
          },
        ]
      : []),
    {
      label: "Atendimentos de hoje",
      value: String(scheduled.length),
      hint: `${completed.length} já concluído${completed.length === 1 ? "" : "s"}`,
      href: "/agenda",
    },
    ...(canFinance
      ? [
          {
            label: "Valores a receber",
            value: formatBRL(receivableTotal),
            hint: `${receivableCount} lançamento${receivableCount === 1 ? "" : "s"} em aberto`,
            href: "/financeiro#a-receber",
          },
        ]
      : []),
    {
      label: "Pendências",
      value: String(pendingCount),
      hint: pendingCount
        ? "Itens esperando uma ação sua"
        : "Nada esperando por você",
      href: "#precisa-atencao",
    },
  ];

  return (
    <>
      {justOnboarded ? <WelcomeConversion /> : null}
      <PageHeader
        eyebrow={
          formatDateKey(todayInTz, {
            weekday: "long",
            day: "2-digit",
            month: "long",
          })
            .charAt(0)
            .toUpperCase() +
          formatDateKey(todayInTz, {
            weekday: "long",
            day: "2-digit",
            month: "long",
          }).slice(1)
        }
        title={`Olá, ${tenant.profileName.split(" ")[0]}!`}
        description="Tudo o que importa hoje, em um lugar só."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PlanBadge plan={tenant.plan} />
            <Button asChild variant="outline">
              <Link href={`/${tenant.slug}/agendar`} target="_blank">
                <ExternalLink className="size-4" /> Página de agendamento
              </Link>
            </Button>
            {canSchedule ? (
              <ManualAppointmentSheet
                clients={clientData ?? []}
                services={(serviceData ?? []).map((service) => ({
                  id: service.id,
                  name: service.name,
                  durationMinutes: service.duration_minutes,
                }))}
                professionals={(professionalData ?? []).map((professional) => ({
                  id: professional.id,
                  name: professional.name,
                  serviceIds:
                    serviceIdsByProfessional.get(professional.id) ?? [],
                }))}
                timezone={tenant.timezone}
                todayInTz={todayInTz}
              />
            ) : null}
          </div>
        }
      />

      {activationSteps.length ? (
        <ActivationChecklist steps={activationSteps} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const body = (
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {metric.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-2xl font-semibold sm:text-3xl">
                  {metric.value}
                </p>
                <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                  {metric.trend === "up" ? (
                    <TrendingUp className="size-3.5 text-emerald-600" />
                  ) : metric.trend === "down" ? (
                    <TrendingDown className="size-3.5 text-rose-600" />
                  ) : null}
                  {metric.hint}
                </p>
              </CardContent>
            </Card>
          );
          return metric.href ? (
            <Link key={metric.label} href={metric.href} className="block">
              {body}
            </Link>
          ) : (
            <div key={metric.label}>{body}</div>
          );
        })}
      </div>

      {actionItems.length ? (
        <Card
          className="border-warning/40 mt-6 scroll-mt-20"
          id="precisa-atencao"
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleAlert className="text-warning size-4" />
              Precisa da sua atenção
            </CardTitle>
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

      {/* Duas colunas (§7.1.4): a esquerda é o dia, a direita é o mês. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="size-4" /> Agenda de hoje
                </CardTitle>
                {nextAppointment ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Próximo às{" "}
                    <span className="text-foreground font-mono font-semibold">
                      {formatTimeInTz(
                        nextAppointment.startsAt,
                        tenant.timezone,
                      )}
                    </span>{" "}
                    — {nextAppointment.clientName}
                  </p>
                ) : null}
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/agenda">
                  Ver agenda <ArrowRight />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {scheduled.length ? (
                scheduled.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded-lg border p-3.5"
                  >
                    <span className="font-mono text-sm font-semibold">
                      {formatTimeInTz(item.startsAt, tenant.timezone)}
                    </span>
                    <div className="min-w-0 flex-1">
                      {item.clientId ? (
                        <Link
                          href={`/clientes/${item.clientId}`}
                          className="truncate text-sm font-medium hover:underline"
                        >
                          {item.clientName}
                        </Link>
                      ) : (
                        <p className="truncate text-sm font-medium">
                          {item.clientName}
                        </p>
                      )}
                      <p className="text-muted-foreground truncate text-xs">
                        {item.serviceName}
                        {item.professionalName
                          ? ` · ${item.professionalName}`
                          : ""}
                      </p>
                    </div>
                    <AppointmentStatusBadge status={item.status} />
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  Nenhum horário para hoje. Compartilhe sua página de
                  agendamento!
                </p>
              )}
            </CardContent>
          </Card>

          {reminders.length ? (
            <Card className="border-emerald-300 dark:border-emerald-900">
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
                        {item.professionalName
                          ? ` · ${item.professionalName}`
                          : ""}
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
        </div>

        <div className="space-y-6">
          {canFinance ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="size-4" /> Resultado do mês
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Row label="Total vendido" value={formatBRL(soldMonth)} />
                <Row
                  label="Despesas pagas"
                  value={formatBRL(expensesMonth)}
                  tone="negative"
                />
                <div className="flex items-baseline justify-between border-t pt-3">
                  <span className="text-sm font-medium">Lucro (caixa)</span>
                  <span
                    className={`font-mono text-xl font-semibold ${
                      profitMonth >= 0
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {formatBRL(profitMonth)}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  Do dia 1 até hoje. Lucro é recebido menos despesas pagas.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/financeiro">
                    Abrir Financeiro <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {canClients ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">
                  Clientes para chamar
                </CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/clientes?segmento=para_chamar">Ver todos</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {clientsToCall.length ? (
                  clientsToCall.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/clientes/${client.id}`}
                          className="truncate text-sm font-medium hover:underline"
                        >
                          {client.name}
                        </Link>
                        <p className="text-muted-foreground truncate text-xs">
                          {client.daysSince !== null
                            ? `${client.daysSince} dias sem vir`
                            : "Sem visita registrada"}
                          {client.topService ? ` · ${client.topService}` : ""}
                        </p>
                      </div>
                      {client.whatsappHref ? (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="text-emerald-700 dark:text-emerald-400"
                        >
                          <a
                            href={client.whatsappHref}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <MessageCircle className="size-3.5" />
                            Chamar
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground py-6 text-center text-sm">
                    Ninguém em atraso agora. Sua base está em dia.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "negative";
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span
        className={`font-mono text-sm font-semibold ${
          tone === "negative" ? "text-rose-600 dark:text-rose-400" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
