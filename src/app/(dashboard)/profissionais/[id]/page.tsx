import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { formatShortDateInTz } from "@/lib/dates";
import { periodQuery, resolvePeriod } from "@/lib/dates/period";
import { formatBRL } from "@/lib/financial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { ProfessionalTabs } from "@/components/dashboard/professional-tabs";
import {
  ProfessionalDetailsForm,
  ProfessionalServicesForm,
} from "@/components/dashboard/professional-details-form";
import {
  CommissionClosingCard,
  type CommissionClosing,
  type PaySettings,
} from "@/components/dashboard/commission-closing-card";
import {
  WeeklyAvailabilityEditor,
  type WeeklyRule,
} from "@/components/dashboard/weekly-availability-editor";
import {
  ScheduleBlocksCard,
  type ScheduleBlockRow,
} from "@/components/dashboard/schedule-blocks-card";
import { BarList } from "@/components/dashboard/bar-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

type SummaryRow = {
  professional_id: string;
  professional_name: string;
  completed_count: number;
  produced_services: number;
  produced_products: number;
  produced_total: number;
  commission: number;
  base_salary: number;
  model: string;
  advances: number;
  paid: number;
  to_pay: number;
};

/**
 * Ficha do profissional (Fase 3 — item 3.9 / §7.7).
 *
 * O pilar G4 estava entregue pela metade: o sistema respondia "quanto deve
 * receber" (em /comissoes) mas não "quem produziu". Aqui as duas perguntas
 * ficam no mesmo lugar, junto de dados, serviços, expediente e a carteira de
 * clientes da pessoa.
 */
export default async function ProfessionalProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const tenant = await requireTenant();

  const canManage = can(tenant.role, "memberships:manage");
  const canSeeMoney = can(tenant.role, "finance:view");

  const supabase = await createSupabaseServerClient();
  const { data: professional } = await supabase
    .from("professionals")
    .select("id,name,phone,bio,avatar_url,active,public_visible,profile_id")
    .eq("id", id)
    .eq("barbershop_id", tenant.id)
    .maybeSingle();

  if (!professional) notFound();

  // Um profissional pode abrir a própria ficha; ver a de outro exige gestão.
  const isSelf =
    professional.profile_id && professional.profile_id === tenant.profileId;
  if (!canManage && !isSelf) {
    return (
      <>
        <PageHeader
          eyebrow="Equipe"
          title={professional.name}
          description="Ficha do profissional."
        />
        <EmptyState
          title="Acesso restrito"
          description="Você só pode abrir a sua própria ficha."
        />
      </>
    );
  }

  const period = resolvePeriod(tenant.timezone, query);

  const [
    { data: serviceRows },
    { data: linkedRows },
    { data: settingsRow },
    { data: availabilityRows },
    { data: blockRows },
    { data: clientRows },
    { data: summaryRows },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id,name,commission_rate")
      .eq("barbershop_id", tenant.id)
      .eq("active", true)
      .order("name"),
    supabase
      .from("professional_services")
      .select("service_id")
      .eq("barbershop_id", tenant.id)
      .eq("professional_id", id),
    supabase
      .from("employee_pay_settings")
      .select(
        "model,base_salary,payment_period,payment_day,commission_rate",
      )
      .eq("barbershop_id", tenant.id)
      .eq("professional_id", id)
      .maybeSingle(),
    supabase
      .from("professional_availability")
      .select("weekday,starts_at,ends_at,slot_interval_minutes")
      .eq("barbershop_id", tenant.id)
      .eq("professional_id", id)
      .eq("active", true)
      .order("weekday")
      .order("starts_at"),
    supabase
      .from("schedule_blocks")
      .select("id,starts_at,ends_at,reason")
      .eq("barbershop_id", tenant.id)
      .eq("professional_id", id)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(100),
    // Carteira da pessoa: quem ela atendeu, quantas vezes e quando foi a
    // última. Limite alto o bastante para a agenda de um ano de trabalho.
    supabase
      .from("appointments")
      .select("starts_at,client:clients(id,name,phone),service:services(name)")
      .eq("barbershop_id", tenant.id)
      .eq("professional_id", id)
      .eq("status", "completed")
      .order("starts_at", { ascending: false })
      .limit(1000),
    canSeeMoney
      ? supabase.rpc("commission_summary", {
          p_barbershop: tenant.id,
          p_from: period.start.toISOString(),
          p_to: period.end.toISOString(),
          p_timezone: tenant.timezone,
        })
      : Promise.resolve({ data: [] as SummaryRow[] }),
  ]);

  const services = (serviceRows ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    commissionRate: Number(row.commission_rate ?? 0),
  }));
  const selectedIds = (linkedRows ?? []).map((row) => row.service_id as string);

  const rules: WeeklyRule[] = (availabilityRows ?? []).map((rule) => ({
    weekday: rule.weekday,
    startsAt: String(rule.starts_at).slice(0, 5),
    endsAt: String(rule.ends_at).slice(0, 5),
    slotIntervalMinutes: rule.slot_interval_minutes,
  }));

  const blocks: ScheduleBlockRow[] = (blockRows ?? []).map((block) => ({
    id: block.id,
    professionalName: professional.name,
    startsAt: block.starts_at,
    endsAt: block.ends_at,
    reason: block.reason,
  }));

  // Agrega a carteira e o ranking de serviços a partir do mesmo histórico.
  const byClient = new Map<
    string,
    { name: string; phone: string | null; visits: number; last: string }
  >();
  const byService = new Map<string, number>();
  for (const row of clientRows ?? []) {
    const service = first(row.service);
    if (service?.name) {
      byService.set(service.name, (byService.get(service.name) ?? 0) + 1);
    }
    const client = first(row.client);
    if (!client?.id) continue;
    const current = byClient.get(client.id);
    if (current) {
      current.visits += 1;
    } else {
      byClient.set(client.id, {
        name: client.name,
        phone: client.phone ?? null,
        visits: 1,
        // A consulta vem ordenada do mais recente para o mais antigo, então
        // a primeira ocorrência de cada cliente já é a última visita.
        last: row.starts_at,
      });
    }
  }
  const clients = [...byClient.entries()]
    .map(([clientId, value]) => ({ id: clientId, ...value }))
    .sort((a, b) => b.visits - a.visits);
  const topServices = [...byService.entries()].sort((a, b) => b[1] - a[1]);

  const summary = ((summaryRows ?? []) as SummaryRow[]).find(
    (row) => row.professional_id === id,
  );
  const closing: CommissionClosing | null = summary
    ? {
        professionalId: summary.professional_id,
        name: summary.professional_name,
        completedCount: Number(summary.completed_count ?? 0),
        producedServices: Number(summary.produced_services ?? 0),
        producedProducts: Number(summary.produced_products ?? 0),
        producedTotal: Number(summary.produced_total ?? 0),
        commission: Number(summary.commission ?? 0),
        baseSalary: Number(summary.base_salary ?? 0),
        model: (summary.model as CommissionClosing["model"]) ?? "commission",
        advances: Number(summary.advances ?? 0),
        paid: Number(summary.paid ?? 0),
        toPay: Number(summary.to_pay ?? 0),
      }
    : null;

  const settings: PaySettings | null = settingsRow
    ? {
        model: settingsRow.model as PaySettings["model"],
        base_salary: Number(settingsRow.base_salary),
        payment_period:
          settingsRow.payment_period as PaySettings["payment_period"],
        payment_day: settingsRow.payment_day as number | null,
        commission_rate: Number(settingsRow.commission_rate ?? 0),
      }
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Equipe"
        title={professional.name}
        description={professional.bio || "Ficha completa do profissional."}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/profissionais">
              <ArrowLeft className="size-4" /> Voltar para a equipe
            </Link>
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-4">
        <Avatar className="size-14">
          {professional.avatar_url ? (
            <AvatarImage src={professional.avatar_url} alt={professional.name} />
          ) : null}
          <AvatarFallback>
            <UserRound className="size-6" />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-wrap items-center gap-2">
          {!professional.active ? (
            <Badge variant="secondary">Inativo</Badge>
          ) : professional.public_visible ? (
            <Badge className="border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              Disponível para agendamento
            </Badge>
          ) : (
            <Badge variant="outline">Indisponível para agendamento</Badge>
          )}
          <Badge variant="outline">
            {clients.length} cliente{clients.length === 1 ? "" : "s"} na
            carteira
          </Badge>
        </div>
      </div>

      <ProfessionalTabs
        dados={
          canManage ? (
            <ProfessionalDetailsForm
              professional={{
                id: professional.id,
                name: professional.name,
                phone: professional.phone,
                bio: professional.bio,
              }}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados da pessoa</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-1 text-sm">
                <p>{professional.phone || "Sem telefone cadastrado"}</p>
                <p>{professional.bio || "Sem apresentação pública."}</p>
              </CardContent>
            </Card>
          )
        }
        servicos={
          <div className="space-y-6">
            {canManage ? (
              <ProfessionalServicesForm
                professionalId={professional.id}
                services={services}
                selectedIds={selectedIds}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Serviços que executa
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {selectedIds.length
                    ? services
                        .filter((service) => selectedIds.includes(service.id))
                        .map((service) => service.name)
                        .join(" · ")
                    : "Nenhum serviço vinculado."}
                </CardContent>
              </Card>
            )}

            {canSeeMoney && closing ? (
              <CommissionClosingCard
                closing={closing}
                settings={settings}
                suggestedReference={period.label}
                periodLabel={period.label}
              />
            ) : null}
          </div>
        }
        horarios={
          <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expediente semanal</CardTitle>
              </CardHeader>
              <CardContent>
                <WeeklyAvailabilityEditor
                  professionalId={professional.id}
                  initialRules={rules}
                />
              </CardContent>
            </Card>
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-base">
                  Folgas, férias e bloqueios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScheduleBlocksCard
                  professionals={[
                    { id: professional.id, name: professional.name },
                  ]}
                  blocks={blocks}
                  timezone={tenant.timezone}
                />
              </CardContent>
            </Card>
          </div>
        }
        clientes={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Carteira de {professional.name}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Quem esta pessoa já atendeu, do mais frequente para o menos.
              </p>
            </CardHeader>
            <CardContent>
              {clients.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Atendimentos</TableHead>
                      <TableHead className="text-right">
                        Última visita
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.slice(0, 100).map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {client.phone || "Sem telefone"}
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {client.visits}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right">
                          {formatShortDateInTz(client.last, tenant.timezone)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  title="Sem atendimentos concluídos"
                  description="A carteira aparece assim que os primeiros atendimentos forem concluídos."
                />
              )}
            </CardContent>
          </Card>
        }
        resultados={
          <div className="space-y-6">
            <PeriodFilter
              basePath={`/profissionais/${professional.id}`}
              period={period}
            />

            {canSeeMoney && closing ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Atendimentos concluídos",
                    value: String(closing.completedCount),
                  },
                  {
                    label: "Produzido em serviços",
                    value: formatBRL(closing.producedServices),
                  },
                  {
                    label: "Produzido em produtos",
                    value: formatBRL(closing.producedProducts),
                  },
                  {
                    label: "Comissão apurada",
                    value: formatBRL(closing.commission),
                  },
                ].map((metric) => (
                  <Card key={metric.label}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-muted-foreground text-sm font-medium">
                        {metric.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-mono text-2xl font-semibold">
                        {metric.value}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Os valores produzidos aparecem para quem tem acesso ao
                financeiro.
              </p>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Serviços mais executados
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Todo o histórico concluído, não só o período escolhido.
                </p>
              </CardHeader>
              <CardContent>
                <BarList
                  items={topServices.slice(0, 8).map(([name, count]) => ({
                    label: name,
                    value: count,
                    hint: `${count}x`,
                  }))}
                  empty="Sem atendimentos concluídos ainda."
                />
              </CardContent>
            </Card>
          </div>
        }
      />

      {canSeeMoney ? (
        <p className="text-muted-foreground mt-6 text-sm">
          O fechamento completo da equipe fica em{" "}
          <Link
            href={`/financeiro?secao=comissoes&${periodQuery(period)}`}
            className="underline underline-offset-2"
          >
            Financeiro › Comissões
          </Link>
          .
        </p>
      ) : null}
    </>
  );
}
