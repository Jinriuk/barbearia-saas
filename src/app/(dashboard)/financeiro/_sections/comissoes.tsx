import { Coins, HandCoins, Wallet } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResolvedPeriod } from "@/lib/dates/period";
import { formatShortDateInTz } from "@/lib/dates";
import { formatBRL } from "@/lib/financial";
import { EmptyState } from "@/components/feedback/empty-state";
import {
  CommissionClosingCard,
  type CommissionClosing,
  type PaySettings,
} from "@/components/dashboard/commission-closing-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
 * Comissões (Fase 3 — itens 3.1 e 3.4).
 *
 * O fechamento agora é calculado no banco (`commission_summary`): antes a
 * página somava até 3.000 atendimentos no cliente e, acima disso, a comissão
 * exibida era ficção silenciosa. Junto vieram total produzido, vale e o
 * valor a pagar como campo calculado.
 */
export async function ComissoesSection({
  supabase,
  tenantId,
  timezone,
  period,
}: {
  supabase: SupabaseClient;
  tenantId: string;
  timezone: string;
  period: ResolvedPeriod;
}) {
  const [
    { data: summaryRows },
    { data: settingsData },
    { data: paymentData },
    { data: advanceData },
  ] = await Promise.all([
    supabase.rpc("commission_summary", {
      p_barbershop: tenantId,
      p_from: period.start.toISOString(),
      p_to: period.end.toISOString(),
      p_timezone: timezone,
    }),
    supabase
      .from("employee_pay_settings")
      .select(
        "professional_id,model,base_salary,payment_period,payment_day,commission_rate",
      )
      .eq("barbershop_id", tenantId),
    supabase
      .from("employee_payments")
      .select("id,professional_id,amount,reference,paid_at")
      .eq("barbershop_id", tenantId)
      .gte("paid_at", period.start.toISOString())
      .lt("paid_at", period.end.toISOString())
      .order("paid_at", { ascending: false })
      .limit(200),
    supabase
      .from("employee_advances")
      .select("id,professional_id,amount,notes,reference_date")
      .eq("barbershop_id", tenantId)
      .gte("reference_date", period.fromInput)
      .lte("reference_date", period.toInput)
      .order("reference_date", { ascending: false })
      .limit(200),
  ]);

  const rows = (summaryRows ?? []) as SummaryRow[];

  const closings: CommissionClosing[] = rows.map((row) => ({
    professionalId: row.professional_id,
    name: row.professional_name,
    completedCount: Number(row.completed_count ?? 0),
    producedServices: Number(row.produced_services ?? 0),
    producedProducts: Number(row.produced_products ?? 0),
    producedTotal: Number(row.produced_total ?? 0),
    commission: Number(row.commission ?? 0),
    baseSalary: Number(row.base_salary ?? 0),
    model: (row.model as CommissionClosing["model"]) ?? "commission",
    advances: Number(row.advances ?? 0),
    paid: Number(row.paid ?? 0),
    toPay: Number(row.to_pay ?? 0),
  }));

  const settingsByPro = new Map<string, PaySettings>(
    (settingsData ?? []).map((row) => [
      row.professional_id as string,
      {
        model: row.model as PaySettings["model"],
        base_salary: Number(row.base_salary),
        payment_period: row.payment_period as PaySettings["payment_period"],
        payment_day: row.payment_day as number | null,
        commission_rate: Number(row.commission_rate ?? 0),
      },
    ]),
  );

  const names = new Map(
    closings.map((item) => [item.professionalId, item.name]),
  );
  const payments = paymentData ?? [];
  const advances = advanceData ?? [];

  const totals = closings.reduce(
    (acc, item) => ({
      produced: acc.produced + item.producedTotal,
      commission: acc.commission + item.commission,
      advances: acc.advances + item.advances,
      toPay: acc.toPay + item.toPay,
    }),
    { produced: 0, commission: 0, advances: 0, toPay: 0 },
  );

  const metrics = [
    {
      label: "Produzido pela equipe",
      value: formatBRL(totals.produced),
      icon: Coins,
    },
    {
      label: "Comissão apurada",
      value: formatBRL(totals.commission),
      icon: Wallet,
    },
    {
      label: "Vales no período",
      value: formatBRL(totals.advances),
      icon: HandCoins,
    },
    {
      label: "Falta pagar",
      value: formatBRL(totals.toPay),
      icon: Wallet,
      accent: true,
    },
  ];

  return (
    <div className="space-y-6">
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

      <p className="text-muted-foreground text-sm">
        A comissão é apurada por competência: conta o atendimento{" "}
        <span className="text-foreground font-medium">concluído</span> no
        período, tenha o cliente pago ou não. O lucro do Resumo é de caixa — por
        isso o cartão &ldquo;lucro depois da comissão&rdquo; existe lá.
      </p>

      {closings.length ? (
        <div className="space-y-5">
          {closings.map((closing) => (
            <CommissionClosingCard
              key={closing.professionalId}
              closing={closing}
              settings={settingsByPro.get(closing.professionalId) ?? null}
              suggestedReference={period.label}
              periodLabel={period.label}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhum profissional ativo"
          description="Cadastre profissionais para configurar e registrar pagamentos."
        />
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pagamentos do período</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {names.get(payment.professional_id) ?? "Profissional"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {payment.reference || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatShortDateInTz(payment.paid_at, timezone)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatBRL(Number(payment.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Nenhum pagamento registrado no período.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vales do período</CardTitle>
          </CardHeader>
          <CardContent>
            {advances.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advances.map((advance) => (
                    <TableRow key={advance.id}>
                      <TableCell className="font-medium">
                        {names.get(advance.professional_id) ?? "Profissional"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {advance.notes || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatShortDateInTz(
                          `${advance.reference_date}T12:00:00Z`,
                          timezone,
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatBRL(Number(advance.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Nenhum vale no período.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
