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
import { getUtcDayRange } from "@/lib/dates";
import { formatBRL, paymentMethodLabel } from "@/lib/financial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function yearMonthInTz(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return `${year}-${month}`;
}

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
  const currentYm = yearMonthInTz(new Date(), tenant.timezone);

  const [{ data: paidRows }, todayCount] = await Promise.all([
    supabase
      .from("financial_transactions")
      .select("amount,paid_at,payment_method")
      .eq("barbershop_id", tenant.id)
      .eq("type", "income")
      .eq("status", "paid"),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("barbershop_id", tenant.id)
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString())
      .neq("status", "canceled"),
  ]);

  const paid = paidRows ?? [];
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();

  const saldoTotal = paid.reduce((total, row) => total + Number(row.amount), 0);
  const saldoDia = paid.reduce((total, row) => {
    const ms = row.paid_at ? new Date(row.paid_at).getTime() : 0;
    return ms >= dayStartMs && ms < dayEndMs
      ? total + Number(row.amount)
      : total;
  }, 0);
  const saldoMes = paid.reduce((total, row) => {
    if (!row.paid_at) return total;
    return yearMonthInTz(new Date(row.paid_at), tenant.timezone) === currentYm
      ? total + Number(row.amount)
      : total;
  }, 0);

  const byMethod = new Map<string, number>();
  for (const row of paid) {
    const key = row.payment_method ?? "other";
    byMethod.set(key, (byMethod.get(key) ?? 0) + Number(row.amount));
  }
  const methodBreakdown = [...byMethod.entries()].sort((a, b) => b[1] - a[1]);

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
