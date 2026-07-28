import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarPlus,
  Crown,
  MessageCircle,
  TriangleAlert,
} from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { formatBRL, paymentMethodLabel } from "@/lib/financial";
import {
  currentEpochMs,
  formatShortDateInTz,
  formatTimeInTz,
} from "@/lib/dates";
import { membershipStatusMeta, type MembershipStatus } from "@/lib/memberships";
import { returnMessage, reminderWhatsAppHref } from "@/lib/whatsapp";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { AppointmentStatusBadge } from "@/components/dashboard/appointment-status-badge";
import { ClientFormSheet } from "@/components/dashboard/client-form-sheet";
import { ClientProfileTabs } from "@/components/dashboard/client-profile-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InsightRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  active: boolean;
  contact_opt_out: boolean;
  notes: string | null;
  last_completed_at: string | null;
  days_since: number | null;
  completed_count: number;
  no_show_count: number;
  total_spent: number;
  avg_ticket: number;
  top_service: string | null;
  top_professional: string | null;
  median_interval_days: number | null;
  expected_return_at: string | null;
  confidence: "alta" | "baixa" | "sem_historico";
  membership_status: MembershipStatus;
  membership_plan_name: string | null;
  membership_period_end: string | null;
};

type HistoryRow = {
  id: string;
  starts_at: string;
  status: string;
  service_name: string | null;
  professional_name: string | null;
  amount: number | null;
  payment_status: string | null;
  payment_method: string | null;
  covered_by_plan: boolean;
};

type PaymentRow = {
  paid_at: string | null;
  description: string;
  amount: number;
  payment_method: string | null;
  source: string;
};

type MembershipRow = {
  id: string;
  plan_name: string;
  period: string;
  price: number;
  effective_status: MembershipStatus;
  current_period_start: string;
  current_period_end: string;
  usage: Array<{
    serviceId: string;
    serviceName: string;
    limit: number;
    used: number;
  }>;
};

const PERIOD_LABELS: Record<string, string> = {
  monthly: "por mês",
  quarterly: "a cada 3 meses",
  yearly: "por ano",
};

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await requireTenant();
  if (!can(tenant.role, "clients:manage")) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  const [insightRes, historyRes, paymentsRes, membershipRes] =
    await Promise.all([
      supabase.rpc("get_client_insights", {
        p_barbershop: tenant.id,
        p_segment: "todos",
        p_search: null,
        p_limit: 1,
        p_offset: 0,
        p_client_id: id,
      }),
      supabase.rpc("get_client_history", {
        p_barbershop: tenant.id,
        p_client_id: id,
        p_limit: 30,
        p_offset: 0,
      }),
      supabase.rpc("get_client_payments", {
        p_barbershop: tenant.id,
        p_client_id: id,
        p_limit: 20,
      }),
      supabase.rpc("get_membership_overview", {
        p_barbershop: tenant.id,
        p_client_id: id,
      }),
    ]);

  const client = ((insightRes.data ?? []) as InsightRow[])[0];
  if (!client) notFound();

  const history = (historyRes.data ?? []) as HistoryRow[];
  const payments = (paymentsRes.data ?? []) as PaymentRow[];
  const membership = ((membershipRes.data ?? []) as MembershipRow[])[0] ?? null;

  const businessTerm =
    tenant.vertical === "salon"
      ? `o salão ${tenant.name}`
      : `a barbearia ${tenant.name}`;
  const whatsappHref = reminderWhatsAppHref(
    client.phone,
    returnMessage({
      clientName: client.name,
      topService: client.top_service,
      topProfessional: client.top_professional,
      businessTerm,
    }),
  );

  const nowMs = currentEpochMs();
  const expectedMs = client.expected_return_at
    ? Date.parse(client.expected_return_at)
    : null;
  const returnLabel = !expectedMs
    ? "Sem previsão"
    : expectedMs < nowMs
      ? "Em atraso"
      : expectedMs < nowMs + 7 * 86_400_000
        ? "Volta em breve"
        : "Em dia";
  const planMeta = membershipStatusMeta(client.membership_status);

  const headline: Array<{ label: string; value: string; hint?: string }> = [
    {
      label: "Gasto total",
      value: formatBRL(Number(client.total_spent)),
      hint: "Atendimentos, produtos e plano",
    },
    {
      label: "Gasto médio",
      value: formatBRL(Number(client.avg_ticket)),
      hint: "Por pagamento registrado",
    },
    {
      label: "Próximo retorno",
      value: client.expected_return_at
        ? formatShortDateInTz(client.expected_return_at, tenant.timezone)
        : "—",
      hint:
        client.confidence === "alta"
          ? `A cada ~${client.median_interval_days} dias`
          : client.confidence === "baixa"
            ? "Poucas visitas — previsão fraca"
            : "Sem histórico",
    },
    {
      label: "Profissional habitual",
      value: client.top_professional ?? "—",
      hint: client.top_service
        ? `Costuma fazer ${client.top_service}`
        : undefined,
    },
  ];

  return (
    <>
      <div className="mb-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/clientes">
            <ArrowLeft className="size-4" /> Clientes
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow="Relacionamento"
        title={client.name}
        description={`${client.phone}${client.email ? ` · ${client.email}` : ""}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {whatsappHref ? (
              <Button asChild variant="outline" className="text-success">
                <a href={whatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4" /> Chamar no WhatsApp
                </a>
              </Button>
            ) : null}
            <Button asChild>
              <Link href="/agenda?view=dia">
                <CalendarPlus className="size-4" /> Novo agendamento
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="outline">{returnLabel}</Badge>
        {planMeta ? (
          <Badge variant={planMeta.tone}>
            {planMeta.label}
            {client.membership_plan_name
              ? ` · ${client.membership_plan_name}`
              : ""}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Sem plano
          </Badge>
        )}
        {!client.active ? <Badge variant="secondary">Arquivado</Badge> : null}
        {client.contact_opt_out ? (
          <Badge variant="outline" className="text-muted-foreground">
            Pediu para não ser contatado
          </Badge>
        ) : null}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {headline.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="truncate font-mono text-xl font-semibold">
                {item.value}
              </p>
              {item.hint ? (
                <p className="text-muted-foreground mt-1 truncate text-xs">
                  {item.hint}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <ClientProfileTabs
        resumo={
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
              <Fact
                label="Última visita"
                value={
                  client.last_completed_at
                    ? `${formatShortDateInTz(client.last_completed_at, tenant.timezone)} — há ${client.days_since} dias`
                    : "Nunca veio"
                }
              />
              <Fact
                label="Atendimentos concluídos"
                value={String(client.completed_count)}
              />
              <Fact
                label="Faltas registradas"
                value={String(client.no_show_count)}
              />
              <Fact
                label="Intervalo habitual"
                value={
                  client.median_interval_days
                    ? `A cada ~${client.median_interval_days} dias`
                    : "Ainda sem padrão"
                }
              />
              <Fact
                label="Serviço habitual"
                value={client.top_service ?? "—"}
              />
              <Fact
                label="Confiança da previsão"
                value={
                  client.confidence === "alta"
                    ? "Alta — 3 visitas ou mais"
                    : client.confidence === "baixa"
                      ? "Baixa — 1 ou 2 visitas"
                      : "Sem histórico"
                }
              />
            </CardContent>
          </Card>
        }
        historico={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Atendimentos
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  últimos {history.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length ? (
                <div className="space-y-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
                    >
                      <div className="w-24 shrink-0">
                        <p className="font-mono text-sm font-semibold">
                          {formatShortDateInTz(item.starts_at, tenant.timezone)}
                        </p>
                        <p className="text-muted-foreground font-mono text-xs">
                          {formatTimeInTz(item.starts_at, tenant.timezone)}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.service_name ?? "Serviço"}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          com {item.professional_name ?? "profissional"}
                        </p>
                      </div>
                      <div className="text-right">
                        {item.covered_by_plan ? (
                          <span className="text-warning inline-flex items-center gap-1 text-xs">
                            <Crown className="size-3.5" /> Coberto pelo plano
                          </span>
                        ) : item.amount !== null ? (
                          <p className="font-mono text-sm font-semibold">
                            {formatBRL(Number(item.amount))}
                            <span className="text-muted-foreground ml-1 text-xs font-normal">
                              {item.payment_status === "paid"
                                ? paymentMethodLabel(item.payment_method)
                                : "a receber"}
                            </span>
                          </p>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Sem lançamento
                          </span>
                        )}
                      </div>
                      <AppointmentStatusBadge status={item.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Nenhum atendimento ainda"
                  description="Assim que o primeiro horário for concluído, ele aparece aqui."
                />
              )}
            </CardContent>
          </Card>
        }
        plano={
          <Card>
            <CardContent className="pt-6">
              {membership ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">
                        {membership.plan_name}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {formatBRL(Number(membership.price))}{" "}
                        {PERIOD_LABELS[membership.period] ?? membership.period}
                      </p>
                    </div>
                    {membershipStatusMeta(membership.effective_status) ? (
                      <Badge
                        variant={
                          membershipStatusMeta(membership.effective_status)!
                            .tone
                        }
                      >
                        {
                          membershipStatusMeta(membership.effective_status)!
                            .label
                        }
                      </Badge>
                    ) : null}
                  </div>

                  <Fact
                    label="Período vigente"
                    value={`${formatShortDateInTz(membership.current_period_start, tenant.timezone)} até ${formatShortDateInTz(membership.current_period_end, tenant.timezone)}`}
                  />

                  {membership.usage.length ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Serviços do plano</p>
                      {membership.usage.map((item) => {
                        const left = Math.max(item.limit - item.used, 0);
                        return (
                          <div
                            key={item.serviceId}
                            className="flex items-center justify-between rounded-lg border p-3 text-sm"
                          >
                            <span>{item.serviceName}</span>
                            <span className="font-mono">
                              {item.used}/{item.limit}
                              <span className="text-muted-foreground ml-2 text-xs">
                                {left
                                  ? `restam ${left}`
                                  : "limite do período usado"}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  <Button asChild variant="outline">
                    <Link href="/planos">Gerenciar em Planos de clientes</Link>
                  </Button>
                </div>
              ) : (
                <EmptyState
                  title="Sem plano contratado"
                  description="Venda um plano em Planos de clientes para o cliente virar assinante."
                />
              )}
            </CardContent>
          </Card>
        }
        valores={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pagamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length ? (
                <div className="space-y-2">
                  {payments.map((item, index) => (
                    <div
                      key={`${item.paid_at}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item.description}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {item.paid_at
                            ? formatShortDateInTz(item.paid_at, tenant.timezone)
                            : "—"}{" "}
                          · {paymentMethodLabel(item.payment_method)}
                        </p>
                      </div>
                      <p className="font-mono text-sm font-semibold">
                        {formatBRL(Number(item.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Nada recebido ainda"
                  description="Serviços, produtos e planos pagos por este cliente aparecem aqui."
                />
              )}
            </CardContent>
          </Card>
        }
        observacoes={
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Observações internas</CardTitle>
              <ClientFormSheet
                variant="icon"
                client={{
                  id: client.id,
                  name: client.name,
                  phone: client.phone,
                  email: client.email,
                  notes: client.notes,
                }}
              />
            </CardHeader>
            <CardContent>
              {client.notes ? (
                <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
              ) : (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <TriangleAlert className="size-4" />
                  Nenhuma observação registrada. Use &ldquo;Editar&rdquo; para
                  anotar preferências, alergias e combinados.
                </p>
              )}
            </CardContent>
          </Card>
        }
      />
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
