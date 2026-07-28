import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, TriangleAlert } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { formatBRL } from "@/lib/financial";
import { currentEpochMs, formatShortDateInTz } from "@/lib/dates";
import { membershipStatusMeta, type MembershipStatus } from "@/lib/memberships";
import { returnMessage, reminderWhatsAppHref } from "@/lib/whatsapp";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  archiveClient,
  deleteClientPermanently,
  restoreClient,
} from "@/modules/clients/actions";
import { ClientFormSheet } from "@/components/dashboard/client-form-sheet";
import { ClientContactActions } from "@/components/dashboard/client-contact-actions";
import { ArchiveClientButton } from "@/components/dashboard/archive-client-button";
import { RestoreClientButton } from "@/components/dashboard/restore-client-button";
import { DeleteClientForeverButton } from "@/components/dashboard/delete-client-forever-button";

const PAGE_SIZE = 25;

const SEGMENTS: Array<{ value: string; label: string; hint: string }> = [
  { value: "todos", label: "Todos", hint: "Base ativa completa." },
  {
    value: "para_chamar",
    label: "Para chamar",
    hint: "Retorno previsto já passou, sem contato nos últimos 14 dias e sem opt-out.",
  },
  {
    value: "assinantes",
    label: "Assinantes",
    hint: "Clientes com plano em aberto (ativo ou pausado).",
  },
  {
    value: "inadimplentes",
    label: "Inadimplentes",
    hint: "Assinantes cujo período do plano venceu e ainda não foi renovado.",
  },
  {
    value: "proximos",
    label: "Próximos do retorno",
    hint: "Retorno previsto para os próximos 7 dias.",
  },
  {
    value: "atrasados",
    label: "Em atraso",
    hint: "Retorno previsto já passou (inclui quem pediu para não contatar).",
  },
  {
    value: "sem_voltar_60",
    label: "Sem voltar há 60 dias",
    hint: "Última visita concluída há 60 dias ou mais.",
  },
  { value: "arquivados", label: "Arquivados", hint: "Clientes arquivados." },
];

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
  last_contact_at: string | null;
  last_contact_outcome: string | null;
  membership_status: MembershipStatus;
  membership_plan_name: string | null;
  membership_period_end: string | null;
  total_count: number;
};

function returnBadge(row: InsightRow, nowMs: number) {
  if (!row.expected_return_at) {
    return { label: "Sem previsão", className: "text-muted-foreground" };
  }
  const expected = Date.parse(row.expected_return_at);
  const overdue = expected < nowMs;
  const soon = !overdue && expected < nowMs + 7 * 86_400_000;
  if (overdue)
    return {
      label: "Em atraso",
      className: "border-warning/50 text-warning",
    };
  if (soon)
    return { label: "Volta em breve", className: "border-info/50 text-info" };
  return { label: "Em dia", className: "border-success/50 text-success" };
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    segmento?: string;
    q?: string;
    p?: string;
    arquivados?: string;
  }>;
}) {
  const tenant = await requireTenant();
  // A tela inteira depende de clients:manage — era a única do painel sem
  // checagem de papel.
  if (!can(tenant.role, "clients:manage")) redirect("/dashboard");

  const params = await searchParams;
  // Compatibilidade com o link antigo ?arquivados=1.
  const segment = SEGMENTS.some((s) => s.value === params.segmento)
    ? (params.segmento as string)
    : params.arquivados === "1"
      ? "arquivados"
      : "todos";
  const search = (params.q ?? "").trim().slice(0, 60);
  const page = Math.max(1, Number(params.p) || 1);
  const supabase = await createSupabaseServerClient();

  // Busca, filtros, agregados e paginação no servidor.
  const [insightRes, activeCountRes, toCallRes, membershipRes] =
    await Promise.all([
      supabase.rpc("get_client_insights", {
        p_barbershop: tenant.id,
        p_segment: segment,
        p_search: search || null,
        p_limit: PAGE_SIZE,
        p_offset: (page - 1) * PAGE_SIZE,
        p_client_id: null,
      }),
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("barbershop_id", tenant.id)
        .eq("active", true),
      supabase.rpc("count_clients_to_call", { p_barbershop: tenant.id }),
      supabase.rpc("count_memberships_attention", {
        p_barbershop: tenant.id,
        p_days: 7,
      }),
    ]);

  // Falha da RPC não pode virar "nenhum cliente cadastrado" em silêncio.
  const loadError = insightRes.error;
  const rows = (loadError ? [] : (insightRes.data ?? [])) as InsightRow[];
  const totalCount = rows[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const activeSegment = SEGMENTS.find((s) => s.value === segment)!;
  const businessTerm =
    tenant.vertical === "salon"
      ? `o salão ${tenant.name}`
      : `a barbearia ${tenant.name}`;

  const membershipRow = Array.isArray(membershipRes.data)
    ? membershipRes.data[0]
    : membershipRes.data;
  const dueSoon = Number(
    (membershipRow as { due_soon?: number } | null)?.due_soon ?? 0,
  );
  const pastDue = Number(
    (membershipRow as { past_due?: number } | null)?.past_due ?? 0,
  );

  const indicators = [
    {
      label: "Clientes ativos",
      value: String(activeCountRes.count ?? 0),
      hint: "Base sem os arquivados",
      href: "/clientes",
    },
    {
      label: "Clientes para chamar",
      value: String(Number(toCallRes.data ?? 0)),
      hint: "Retorno vencido e sem contato recente",
      href: "/clientes?segmento=para_chamar",
    },
    {
      label: "Planos vencendo",
      value: String(dueSoon + pastDue),
      hint: `${pastDue} vencido${pastDue === 1 ? "" : "s"} · ${dueSoon} vence${dueSoon === 1 ? "" : "m"} em 7 dias`,
      href: "/clientes?segmento=inadimplentes",
    },
  ];

  // Derivados calculados fora do JSX (instante único por request).
  const nowMs = currentEpochMs();
  const viewRows = rows.map((row) => ({
    row,
    badge: returnBadge(row, nowMs),
    plan: membershipStatusMeta(row.membership_status),
    whatsappHref: reminderWhatsAppHref(
      row.phone,
      returnMessage({
        clientName: row.name,
        topService: row.top_service,
        topProfessional: row.top_professional,
        businessTerm,
      }),
    ),
    recentContact: Boolean(
      row.last_contact_at &&
      Date.parse(row.last_contact_at) > nowMs - 30 * 86_400_000,
    ),
  }));

  const buildQuery = (patch: Record<string, string | undefined>) => {
    const urlParams = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      segmento: segment === "todos" ? undefined : segment,
      q: search || undefined,
      ...patch,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) urlParams.set(key, value);
    }
    const qs = urlParams.toString();
    return qs ? `/clientes?${qs}` : "/clientes";
  };

  return (
    <>
      <PageHeader
        eyebrow="Relacionamento"
        title="Clientes"
        description="Quem precisa voltar, quem está em dia e a ação de retorno a um toque."
        action={<ClientFormSheet />}
      />

      {loadError ? (
        <Alert variant="destructive" className="mb-4">
          <TriangleAlert className="size-4" />
          <AlertDescription>
            Não foi possível carregar os clientes agora. Atualize a página — se
            continuar, avise o suporte.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        {indicators.map((item) => (
          <Link key={item.label} href={item.href} className="block">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {item.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-2xl font-semibold">{item.value}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {item.hint}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Segmentos (limites documentados no hint e em docs/05). */}
      <div className="mb-4 flex flex-wrap gap-2">
        {SEGMENTS.map((item) => (
          <Button
            key={item.value}
            asChild
            size="sm"
            variant={segment === item.value ? "default" : "outline"}
            title={item.hint}
          >
            <Link
              href={buildQuery({
                segmento: item.value === "todos" ? undefined : item.value,
                p: undefined,
              })}
            >
              {item.label}
            </Link>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">
              {activeSegment.label}
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                {totalCount} cliente{totalCount === 1 ? "" : "s"}
              </span>
            </CardTitle>
            <form action="/clientes" className="flex items-center gap-2">
              {segment !== "todos" ? (
                <input type="hidden" name="segmento" value={segment} />
              ) : null}
              <input
                type="search"
                name="q"
                defaultValue={search}
                placeholder="Buscar por nome ou WhatsApp…"
                aria-label="Buscar cliente por nome ou WhatsApp"
                className="border-input bg-background h-9 w-40 rounded-lg border px-3 text-sm sm:w-56"
              />
              <Button size="sm" variant="outline" type="submit">
                <Search className="size-3.5" />
                <span className="sr-only">Buscar</span>
              </Button>
            </form>
          </div>
          <p className="text-muted-foreground text-xs">{activeSegment.hint}</p>
        </CardHeader>
        <CardContent>
          {viewRows.length ? (
            <div className="space-y-3">
              {viewRows.map(
                ({ row, badge, plan, whatsappHref, recentContact }) => (
                  <div key={row.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/clientes/${row.id}`}
                          className="font-medium hover:underline"
                        >
                          {row.name}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          {row.phone}
                          {row.email ? ` · ${row.email}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {plan ? (
                          <Badge variant="outline" className={plan.className}>
                            {plan.label}
                          </Badge>
                        ) : null}
                        <Badge variant="outline" className={badge.className}>
                          {badge.label}
                          {row.confidence === "baixa"
                            ? " · poucas visitas"
                            : ""}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-muted-foreground mt-3 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-4">
                      <p>
                        Última visita:{" "}
                        <span className="text-foreground font-medium">
                          {row.last_completed_at
                            ? `${formatShortDateInTz(row.last_completed_at, tenant.timezone)} (${row.days_since}d)`
                            : "nunca"}
                        </span>
                      </p>
                      <p>
                        Atendimentos:{" "}
                        <span className="text-foreground font-medium">
                          {row.completed_count}
                        </span>
                        {row.median_interval_days
                          ? ` · a cada ~${row.median_interval_days}d`
                          : ""}
                      </p>
                      <p>
                        Gasto:{" "}
                        <span className="text-foreground font-medium">
                          {formatBRL(Number(row.total_spent))}
                        </span>
                        {Number(row.avg_ticket) > 0
                          ? ` · médio ${formatBRL(Number(row.avg_ticket))}`
                          : ""}
                      </p>
                      <p>
                        Retorno previsto:{" "}
                        <span className="text-foreground font-medium">
                          {row.expected_return_at
                            ? formatShortDateInTz(
                                row.expected_return_at,
                                tenant.timezone,
                              )
                            : "—"}
                        </span>
                      </p>
                      {row.top_service ? (
                        <p className="sm:col-span-2">
                          Costuma fazer{" "}
                          <span className="text-foreground font-medium">
                            {row.top_service}
                          </span>
                          {row.top_professional
                            ? ` com ${row.top_professional}`
                            : ""}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                      {segment === "arquivados" || !row.active ? (
                        <span className="inline-flex items-center gap-1">
                          <RestoreClientButton
                            id={row.id}
                            action={restoreClient}
                            itemName={row.name}
                          />
                          {tenant.role === "owner" ||
                          tenant.role === "manager" ? (
                            <DeleteClientForeverButton
                              id={row.id}
                              action={deleteClientPermanently}
                              itemName={row.name}
                            />
                          ) : null}
                        </span>
                      ) : (
                        <>
                          <ClientContactActions
                            clientId={row.id}
                            whatsappHref={whatsappHref}
                            optOut={row.contact_opt_out}
                            lastContactOutcome={row.last_contact_outcome}
                            hasRecentContact={recentContact}
                          />
                          <span className="inline-flex items-center gap-1.5">
                            <ClientFormSheet
                              variant="icon"
                              client={{
                                id: row.id,
                                name: row.name,
                                phone: row.phone,
                                email: row.email,
                                notes: row.notes,
                              }}
                            />
                            <ArchiveClientButton
                              id={row.id}
                              action={archiveClient}
                              itemName={row.name}
                            />
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ),
              )}

              {totalPages > 1 ? (
                <div className="flex items-center justify-between pt-2">
                  <Button
                    asChild={page > 1}
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                  >
                    {page > 1 ? (
                      <Link href={buildQuery({ p: String(page - 1) })}>
                        Anterior
                      </Link>
                    ) : (
                      <span>Anterior</span>
                    )}
                  </Button>
                  <p className="text-muted-foreground text-sm">
                    Página {page} de {totalPages}
                  </p>
                  <Button
                    asChild={page < totalPages}
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                  >
                    {page < totalPages ? (
                      <Link href={buildQuery({ p: String(page + 1) })}>
                        Próxima
                      </Link>
                    ) : (
                      <span>Próxima</span>
                    )}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title={
                loadError
                  ? "Não foi possível carregar a lista"
                  : search
                    ? `Nada encontrado para "${search}"`
                    : segment === "todos"
                      ? "Nenhum cliente cadastrado"
                      : "Ninguém neste grupo agora"
              }
              description={
                loadError
                  ? "O erro está descrito acima. Nenhum dado foi perdido."
                  : segment === "todos"
                    ? "Novos agendamentos públicos também criam clientes automaticamente."
                    : activeSegment.hint
              }
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
