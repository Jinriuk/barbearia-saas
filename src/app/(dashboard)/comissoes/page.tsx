import Link from "next/link";
import { Coins, HandCoins } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { getUtcMonthRange, formatShortDateInTz } from "@/lib/dates";
import { formatBRL } from "@/lib/financial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EmployeePayCard,
  type EmployeePaySettings,
} from "@/components/dashboard/employee-pay-card";
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

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default async function EmployeePaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const tenant = await requireTenant();

  if (!can(tenant.role, "finance:view")) {
    return (
      <>
        <PageHeader
          eyebrow="Financeiro"
          title="Pagamento de Funcionários"
          description="Salários, comissões e histórico de pagamentos da equipe."
        />
        <EmptyState
          title="Acesso restrito"
          description="Apenas o proprietário acessa os pagamentos da equipe."
        />
      </>
    );
  }

  const { start, end, year, month } = getUtcMonthRange(tenant.timezone, mes);
  const previous =
    month === 1 ? monthKey(year - 1, 12) : monthKey(year, month - 1);
  const next = month === 12 ? monthKey(year + 1, 1) : monthKey(year, month + 1);
  const reference = `${monthNames[month - 1]}/${year}`;

  const supabase = await createSupabaseServerClient();
  const [
    { data: professionalData },
    { data: appointmentData },
    { data: settingsData },
    { data: paymentData },
  ] = await Promise.all([
    supabase
      .from("professionals")
      .select("id,name")
      .eq("barbershop_id", tenant.id)
      .eq("active", true)
      .order("name"),
    supabase
      .from("appointments")
      .select(
        "id,professional_id,service:services(price,commission_rate)",
      )
      .eq("barbershop_id", tenant.id)
      .eq("status", "completed")
      .gte("starts_at", start.toISOString())
      .lt("starts_at", end.toISOString())
      .limit(3000),
    supabase
      .from("employee_pay_settings")
      .select("professional_id,model,base_salary,payment_period,payment_day")
      .eq("barbershop_id", tenant.id),
    supabase
      .from("employee_payments")
      .select("id,professional_id,amount,reference,paid_at")
      .eq("barbershop_id", tenant.id)
      .gte("paid_at", start.toISOString())
      .lt("paid_at", end.toISOString())
      .order("paid_at", { ascending: false }),
  ]);

  const professionals = professionalData ?? [];
  const settingsByPro = new Map<string, EmployeePaySettings>(
    (settingsData ?? []).map((row) => [
      row.professional_id as string,
      {
        model: row.model as EmployeePaySettings["model"],
        base_salary: Number(row.base_salary),
        payment_period:
          row.payment_period as EmployeePaySettings["payment_period"],
        payment_day: row.payment_day as number | null,
      },
    ]),
  );

  const commissionByPro = new Map<string, number>();
  for (const item of appointmentData ?? []) {
    const service = first(item.service);
    if (!service || !item.professional_id) continue;
    const commission =
      (Number(service.price) * Number(service.commission_rate)) / 100;
    commissionByPro.set(
      item.professional_id,
      (commissionByPro.get(item.professional_id) ?? 0) + commission,
    );
  }

  const payments = paymentData ?? [];
  const paidByPro = new Map<string, number>();
  for (const payment of payments) {
    paidByPro.set(
      payment.professional_id,
      (paidByPro.get(payment.professional_id) ?? 0) + Number(payment.amount),
    );
  }
  const professionalNames = new Map(professionals.map((p) => [p.id, p.name]));

  const totalCommission = [...commissionByPro.values()].reduce(
    (total, value) => total + value,
    0,
  );
  const totalPaid = payments.reduce(
    (total, payment) => total + Number(payment.amount),
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Financeiro"
        title="Pagamento de Funcionários"
        description="Configure salário, período e comissão de cada profissional e registre os pagamentos."
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/comissoes?mes=${previous}`}>← Anterior</Link>
            </Button>
            <span className="min-w-36 text-center text-sm font-medium">
              {monthNames[month - 1]} de {year}
            </span>
            <Button asChild variant="outline" size="sm">
              <Link href={`/comissoes?mes=${next}`}>Próximo →</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Comissões calculadas no mês
            </CardTitle>
            <Coins className="text-primary size-4" />
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-semibold">
              {formatBRL(totalCommission)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total pago no mês
            </CardTitle>
            <HandCoins className="text-primary size-4" />
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-semibold">
              {formatBRL(totalPaid)}
            </p>
          </CardContent>
        </Card>
      </div>

      {professionals.length ? (
        <div className="mt-6 space-y-5">
          {professionals.map((professional) => (
            <EmployeePayCard
              key={professional.id}
              professionalId={professional.id}
              name={professional.name}
              monthCommission={commissionByPro.get(professional.id) ?? 0}
              monthlyPaid={paidByPro.get(professional.id) ?? 0}
              settings={settingsByPro.get(professional.id) ?? null}
              suggestedReference={reference}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            title="Nenhum profissional ativo"
            description="Cadastre profissionais para configurar e registrar pagamentos."
          />
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Histórico do mês</CardTitle>
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
                      {professionalNames.get(payment.professional_id) ??
                        "Profissional"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.reference || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatShortDateInTz(payment.paid_at, tenant.timezone)}
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
              Nenhum pagamento registrado neste mês.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
