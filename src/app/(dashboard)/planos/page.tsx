import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { membershipChargeMessage, reminderWhatsAppHref } from "@/lib/whatsapp";
import { PageHeader } from "@/components/layout/page-header";
import { SectionNav } from "@/components/layout/section-nav";
import { EmptyState } from "@/components/feedback/empty-state";
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
import { MembershipPlanSheet } from "@/components/dashboard/membership-plan-sheet";
import { SellMembershipSheet } from "@/components/dashboard/sell-membership-sheet";
import { MembershipActions } from "@/components/dashboard/membership-actions";
import { toggleMembershipPlan } from "@/modules/memberships/actions";

const PERIOD_LABELS: Record<string, string> = {
  monthly: "mensal",
  quarterly: "trimestral",
  yearly: "anual",
};

type OverviewRow = {
  id: string;
  client_id: string;
  client_name: string;
  client_phone: string | null;
  plan_id: string;
  plan_name: string;
  period: string;
  price: number;
  status: "active" | "paused";
  effective_status: "active" | "paused" | "past_due";
  current_period_start: string;
  current_period_end: string;
  usage: {
    serviceId: string;
    serviceName: string;
    limit: number;
    used: number;
  }[];
};

function money(value: number) {
  return `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export default async function MembershipPlansPage() {
  const tenant = await requireTenant();
  if (!can(tenant.role, "clients:manage")) {
    redirect("/dashboard");
  }
  const canManagePlans = can(tenant.role, "catalog:manage");
  const supabase = await createSupabaseServerClient();
  const [
    { data: planData },
    { data: entitlementData },
    { data: serviceData },
    { data: clientData },
    { data: overviewData },
  ] = await Promise.all([
    supabase
      .from("customer_membership_plans")
      .select("id,name,description,price,period,active")
      .eq("barbershop_id", tenant.id)
      .order("name"),
    supabase
      .from("membership_entitlements")
      .select("plan_id,service_id,uses_per_period")
      .eq("barbershop_id", tenant.id),
    supabase
      .from("services")
      .select("id,name,price")
      .eq("barbershop_id", tenant.id)
      .eq("active", true)
      .order("name"),
    supabase
      .from("clients")
      .select("id,name,phone")
      .eq("barbershop_id", tenant.id)
      .eq("active", true)
      .order("name")
      .limit(500),
    supabase.rpc("get_membership_overview", { p_barbershop: tenant.id }),
  ]);

  const services = serviceData ?? [];
  const serviceNames = new Map(services.map((s) => [s.id, s.name]));
  const entitlementsByPlan = new Map<
    string,
    { service_id: string; uses_per_period: number }[]
  >();
  for (const item of entitlementData ?? []) {
    const list = entitlementsByPlan.get(item.plan_id) ?? [];
    list.push(item);
    entitlementsByPlan.set(item.plan_id, list);
  }
  const plans = (planData ?? []).map((plan) => ({
    ...plan,
    entitlements: entitlementsByPlan.get(plan.id) ?? [],
  }));
  const activePlans = plans.filter((plan) => plan.active);
  const memberships = (overviewData ?? []) as OverviewRow[];
  const businessTerm =
    tenant.vertical === "salon"
      ? `o salão ${tenant.name}`
      : `a barbearia ${tenant.name}`;

  const rows = memberships.map((membership) => ({
    membership,
    periodEndLabel: new Date(membership.current_period_end).toLocaleDateString(
      "pt-BR",
      { timeZone: tenant.timezone },
    ),
    chargeHref:
      membership.effective_status === "past_due"
        ? reminderWhatsAppHref(
            membership.client_phone,
            membershipChargeMessage({
              clientName: membership.client_name,
              planName: membership.plan_name,
              price: Number(membership.price),
              businessTerm,
            }),
          )
        : null,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Clube de assinatura"
        title="Planos de clientes"
        description="Venda recorrente com controle de uso e de vencimento — o benefício vale só para assinante em dia."
        action={
          <div className="flex w-full flex-col gap-2 sm:w-72 sm:flex-row">
            {activePlans.length ? (
              <SellMembershipSheet
                clients={clientData ?? []}
                plans={activePlans.map((plan) => ({
                  id: plan.id,
                  name: plan.name,
                  price: Number(plan.price),
                  periodLabel: PERIOD_LABELS[plan.period] ?? plan.period,
                }))}
              />
            ) : null}
            {canManagePlans ? (
              <MembershipPlanSheet services={services} />
            ) : null}
          </div>
        }
      />
      <SectionNav section="catalogo" role={tenant.role} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contratos ativos</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Uso do período</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ membership, periodEndLabel, chargeHref }) => (
                  <TableRow key={membership.id}>
                    <TableCell>
                      <p className="font-medium">{membership.client_name}</p>
                      <p className="text-muted-foreground text-xs">
                        {membership.client_phone ?? "Sem telefone"}
                      </p>
                    </TableCell>
                    <TableCell data-label="Plano">
                      <p>{membership.plan_name}</p>
                      <p className="text-muted-foreground text-xs">
                        {money(Number(membership.price))} ·{" "}
                        {PERIOD_LABELS[membership.period] ?? membership.period}
                      </p>
                    </TableCell>
                    <TableCell data-label="Situação">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {membership.effective_status === "past_due" ? (
                          <Badge variant="danger">Vencido</Badge>
                        ) : membership.effective_status === "paused" ? (
                          <Badge variant="neutral">Pausado</Badge>
                        ) : (
                          <Badge variant="success">Em dia</Badge>
                        )}
                        <span className="text-muted-foreground text-xs">
                          até {periodEndLabel}
                        </span>
                      </div>
                      {chargeHref ? (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="mt-1.5"
                        >
                          <a href={chargeHref} target="_blank" rel="noreferrer">
                            <MessageCircle className="size-3.5" /> Cobrar no
                            WhatsApp
                          </a>
                        </Button>
                      ) : null}
                    </TableCell>
                    <TableCell data-label="Uso do período">
                      {membership.usage.length ? (
                        <ul className="space-y-0.5 text-sm">
                          {membership.usage.map((item) => (
                            <li key={item.serviceId}>
                              <span className="font-medium">
                                {item.used}/{item.limit}
                              </span>{" "}
                              <span className="text-muted-foreground">
                                {item.serviceName}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <MembershipActions
                        membershipId={membership.id}
                        clientName={membership.client_name}
                        status={membership.effective_status}
                        canManage={canManagePlans}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="Nenhum contrato ainda"
              description={
                activePlans.length
                  ? "Use “Vender plano” para registrar o primeiro assinante."
                  : "Crie um plano com os serviços incluídos para começar a vender."
              }
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catálogo de planos</CardTitle>
        </CardHeader>
        <CardContent>
          {plans.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Incluídos</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-muted-foreground max-w-64 truncate text-xs">
                        {plan.description || "Sem descrição"}
                      </p>
                    </TableCell>
                    <TableCell data-label="Preço">
                      {money(Number(plan.price))}
                      <span className="text-muted-foreground text-xs">
                        {" "}
                        /{PERIOD_LABELS[plan.period] ?? plan.period}
                      </span>
                    </TableCell>
                    <TableCell data-label="Incluídos">
                      <ul className="space-y-0.5 text-sm">
                        {plan.entitlements.map((item) => (
                          <li key={item.service_id}>
                            <span className="font-medium">
                              {item.uses_per_period}×
                            </span>{" "}
                            <span className="text-muted-foreground">
                              {serviceNames.get(item.service_id) ?? "Serviço"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell data-label="Situação">
                      <Badge variant={plan.active ? "success" : "neutral"}>
                        {plan.active ? "À venda" : "Desativado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManagePlans ? (
                        <div className="flex items-center justify-end gap-1">
                          <MembershipPlanSheet
                            plan={plan}
                            services={services}
                          />
                          <form action={toggleMembershipPlan}>
                            <input type="hidden" name="id" value={plan.id} />
                            <input
                              type="hidden"
                              name="active"
                              value={String(plan.active)}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {plan.active ? "Desativar" : "Reativar"}
                            </Button>
                          </form>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="Nenhum plano criado"
              description="Monte o primeiro plano (ex.: 2 cortes por mês) e venda no balcão."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
