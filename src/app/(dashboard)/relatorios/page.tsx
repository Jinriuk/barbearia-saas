import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  FileText,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { getUtcDayRange, getUtcMonthRange } from "@/lib/dates";
import { formatBRL, paymentMethodLabel } from "@/lib/financial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { SectionNav } from "@/components/layout/section-nav";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ReportsPage() {
  const tenant = await requireTenant();

  if (!can(tenant.role, "reports:view")) {
    return (
      <>
        <PageHeader
          eyebrow="Relatórios"
          title="Relatórios"
          description="Resumo financeiro e de operação."
        />
        <EmptyState
          title="Acesso restrito"
          description="Você não tem permissão para ver os relatórios."
        />
      </>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { start: dayStart, end: dayEnd } = getUtcDayRange(tenant.timezone);
  const { start: monthStart, end: monthEnd } = getUtcMonthRange(
    tenant.timezone,
  );

  // Somas no banco (Fase 0 §0.7). A consulta que ficava aqui pedia TODAS as
  // receitas pagas da barbearia — sem limite e sem recorte de data — e somava
  // no cliente. O PostgREST devolve ~1000 linhas: da 1001ª em diante o "Saldo
  // total" era o saldo de uma barbearia menor, e nada na tela dizia isso.
  const [{ data: cashRows }, { data: methodRows }, todayCount] =
    await Promise.all([
      supabase.rpc("cash_summary", {
        p_barbershop: tenant.id,
        p_day_from: dayStart.toISOString(),
        p_day_to: dayEnd.toISOString(),
        p_month_from: monthStart.toISOString(),
        p_month_to: monthEnd.toISOString(),
      }),
      supabase.rpc("income_by_payment_method", { p_barbershop: tenant.id }),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("barbershop_id", tenant.id)
        .gte("starts_at", dayStart.toISOString())
        .lt("starts_at", dayEnd.toISOString())
        .neq("status", "canceled"),
    ]);

  const cash = Array.isArray(cashRows) ? cashRows[0] : cashRows;
  const saldoTotal = Number(cash?.total ?? 0);
  const saldoDia = Number(cash?.day_total ?? 0);
  const saldoMes = Number(cash?.month_total ?? 0);

  // Sem método registrado (dados anteriores à Fase 0) → "Não informado",
  // nunca somado como se fosse "Outro".
  const methodBreakdown: Array<[string, number]> = (
    (methodRows ?? []) as Array<{
      payment_method: string | null;
      total: number | string;
    }>
  ).map((row) => [row.payment_method ?? "", Number(row.total)]);

  const metrics = [
    {
      label: "Saldo do dia",
      value: formatBRL(saldoDia),
      icon: Wallet,
      accent: true,
    },
    { label: "Saldo do mês", value: formatBRL(saldoMes), icon: CalendarClock },
    { label: "Saldo total", value: formatBRL(saldoTotal), icon: TrendingUp },
    {
      label: "Atendimentos hoje",
      value: String(todayCount.count ?? 0),
      icon: CalendarCheck,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Relatórios"
        title="Relatórios"
        description="Saldo do dia, do mês e total, com a origem dos recebimentos."
        action={
          can(tenant.role, "finance:view") ? (
            <Button asChild variant="outline">
              <Link href="/relatorio-financeiro" target="_blank">
                <FileText className="size-4" /> Gerar PDF
              </Link>
            </Button>
          ) : undefined
        }
      />
      <SectionNav section="financeiro" role={tenant.role} />
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
              <p className="font-mono text-2xl font-semibold">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 max-w-xl">
        <CardHeader>
          <CardTitle>Recebimentos por forma de pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          {methodBreakdown.length ? (
            <div className="space-y-3">
              {methodBreakdown.map(([method, amount]) => {
                const pct = saldoTotal ? (amount / saldoTotal) * 100 : 0;
                return (
                  <div key={method}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>{paymentMethodLabel(method)}</span>
                      <span className="font-mono font-medium">
                        {formatBRL(amount)}
                      </span>
                    </div>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Sem recebimentos ainda"
              description="Confirme pagamentos no financeiro para alimentar os relatórios."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
