import { CircleDollarSign, Coins, Wallet, TrendingUp } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { getUtcDayRange } from "@/lib/dates";
import {
  formatBRL,
  PAYMENT_METHODS,
  paymentMethodLabel,
} from "@/lib/financial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { confirmPayment, revertPayment } from "@/modules/financial/actions";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { AppointmentStatusBadge } from "@/components/dashboard/appointment-status-badge";
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

export default async function FinanceiroPage() {
  const tenant = await requireTenant();

  if (!can(tenant.role, "finance:view")) {
    return (
      <>
        <PageHeader
          eyebrow="Financeiro"
          title="Financeiro"
          description="Acompanhe os recebimentos do dia."
        />
        <EmptyState
          title="Acesso restrito"
          description="Apenas o proprietário pode ver o financeiro."
        />
      </>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { start: dayStart, end: dayEnd } = getUtcDayRange(tenant.timezone);

  const [{ data: appointmentRows }, { data: paidRows }] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id,starts_at,status,client:clients(name),professional:professionals(name),service:services(name,price),appointment_products(quantity,unit_price)",
      )
      .eq("barbershop_id", tenant.id)
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString())
      .neq("status", "canceled")
      .order("starts_at"),
    supabase
      .from("financial_transactions")
      .select("amount,paid_at,payment_method,appointment_id")
      .eq("barbershop_id", tenant.id)
      .eq("type", "income")
      .eq("status", "paid"),
  ]);

  const paid = paidRows ?? [];
  const paidByAppointment = new Map(
    paid
      .filter((row) => row.appointment_id)
      .map((row) => [row.appointment_id as string, row]),
  );

  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();
  const saldoTotal = paid.reduce((total, row) => total + Number(row.amount), 0);
  const saldoDia = paid.reduce((total, row) => {
    const paidMs = row.paid_at ? new Date(row.paid_at).getTime() : 0;
    return paidMs >= dayStartMs && paidMs < dayEndMs
      ? total + Number(row.amount)
      : total;
  }, 0);

  const appointments = (appointmentRows ?? []).map((item) => {
    const service = first(item.service);
    const productsTotal = (item.appointment_products ?? []).reduce(
      (total, product) =>
        total + Number(product.quantity) * Number(product.unit_price),
      0,
    );
    const amount = Number(service?.price ?? 0) + productsTotal;
    const paidRow = paidByAppointment.get(item.id);
    return {
      id: item.id,
      clientName: first(item.client)?.name ?? "Cliente",
      professionalName: first(item.professional)?.name ?? "",
      serviceName: service?.name ?? "Serviço",
      productCount: (item.appointment_products ?? []).length,
      amount,
      status: item.status,
      paid: Boolean(paidRow),
      paymentMethod: paidRow?.payment_method ?? null,
    };
  });

  const recebidosHoje = appointments.filter((item) => item.paid).length;
  const aReceberHoje = appointments
    .filter((item) => !item.paid)
    .reduce((total, item) => total + item.amount, 0);

  const metrics = [
    {
      label: "Saldo do dia",
      value: formatBRL(saldoDia),
      icon: Wallet,
      accent: true,
    },
    { label: "Saldo total", value: formatBRL(saldoTotal), icon: TrendingUp },
    {
      label: "A receber hoje",
      value: formatBRL(aReceberHoje),
      icon: Coins,
    },
    {
      label: "Recebidos hoje",
      value: String(recebidosHoje),
      icon: CircleDollarSign,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Financeiro"
        title="Financeiro"
        description="Confirme os pagamentos do dia. O saldo é atualizado automaticamente."
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Atendimentos de hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.clientName}</p>
                      <AppointmentStatusBadge
                        status={item.status}
                        className="mt-1"
                      />
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{item.serviceName}</p>
                      <p className="text-muted-foreground text-xs">
                        {item.professionalName
                          ? `com ${item.professionalName}`
                          : ""}
                        {item.productCount
                          ? ` · +${item.productCount} produto(s)`
                          : ""}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {formatBRL(item.amount)}
                    </TableCell>
                    <TableCell>
                      {item.paid ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                            Pago · {paymentMethodLabel(item.paymentMethod)}
                          </Badge>
                          <form action={revertPayment}>
                            <input
                              type="hidden"
                              name="appointmentId"
                              value={item.id}
                            />
                            <Button size="sm" variant="ghost">
                              Marcar não pago
                            </Button>
                          </form>
                        </div>
                      ) : (
                        <form
                          action={confirmPayment}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <input
                            type="hidden"
                            name="appointmentId"
                            value={item.id}
                          />
                          <select
                            name="paymentMethod"
                            defaultValue="pix"
                            aria-label="Forma de pagamento"
                            className="border-input bg-background h-8 rounded-lg border px-2 text-sm"
                          >
                            {PAYMENT_METHODS.map((method) => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </select>
                          <Button size="sm">Confirmar pagamento</Button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="Nenhum atendimento hoje"
              description="Os agendamentos do dia aparecem aqui para confirmar o pagamento."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
