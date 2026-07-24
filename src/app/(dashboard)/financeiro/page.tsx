import Link from "next/link";
import {
  ChartNoAxesCombined,
  FileText,
  HandCoins,
  Package,
  Scissors,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import {
  formatShortDateInTz,
  getUtcDayRange,
  getUtcMonthRange,
} from "@/lib/dates";
import { formatBRL, PAYMENT_METHODS } from "@/lib/financial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  cancelPendingTransaction,
  confirmPayment,
  confirmTransactionPayment,
  revertPayment,
} from "@/modules/financial/actions";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { AppointmentStatusBadge } from "@/components/dashboard/appointment-status-badge";
import {
  MonthlyRevenueChart,
  type MonthlyRevenuePoint,
} from "@/components/dashboard/monthly-revenue-chart";
import { BarList } from "@/components/dashboard/bar-list";
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

const monthLabel = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

type ProfessionalAgg = {
  name: string;
  count: number;
  service: number;
  product: number;
  total: number;
};
type ServiceAgg = { name: string; count: number; revenue: number };
type ProductAgg = { name: string; qty: number; revenue: number };

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
  const {
    start: monthStart,
    end: monthEnd,
    year,
    month,
  } = getUtcMonthRange(tenant.timezone);

  const monthKeyFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tenant.timezone,
    year: "numeric",
    month: "2-digit",
  });
  const monthShortFmt = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: "UTC",
  });
  const chartMonths = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 6 + i, 1));
    return {
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      label: monthShortFmt.format(date).replace(".", ""),
    };
  });
  const { start: chartStart } = getUtcMonthRange(
    tenant.timezone,
    chartMonths[0].key,
  );

  const [
    { data: appointmentRows },
    { data: incomeRows },
    { data: saleRows },
    { data: chartRows },
    { data: summaryRows },
    { data: receivableRows },
    { count: completedCount },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id,starts_at,status,client:clients(name),professional:professionals(name),service:services(name,price),payments:financial_transactions(category,type,status)",
      )
      .eq("barbershop_id", tenant.id)
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString())
      .neq("status", "canceled")
      .order("starts_at"),
    // Vendas de serviço do mês (pagas ou a receber) — produto é tratado à
    // parte. Cancelada não conta.
    supabase
      .from("financial_transactions")
      .select(
        "amount,category,appointment:appointments(professional:professionals(id,name),service:services(id,name))",
      )
      .eq("barbershop_id", tenant.id)
      .eq("type", "income")
      .neq("status", "canceled")
      .neq("category", "product")
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", monthEnd.toISOString()),
    // Vendas de produto confirmadas no mês.
    supabase
      .from("appointment_products")
      .select(
        "quantity,unit_price,confirmed_at,product:products(name),appointment:appointments(professional:professionals(id,name))",
      )
      .eq("barbershop_id", tenant.id)
      .eq("status", "confirmed")
      .gte("confirmed_at", monthStart.toISOString())
      .lt("confirmed_at", monthEnd.toISOString()),
    supabase
      .from("financial_transactions")
      .select("amount,category,paid_at")
      .eq("barbershop_id", tenant.id)
      .eq("type", "income")
      .eq("status", "paid")
      .gte("paid_at", chartStart.toISOString())
      .lt("paid_at", monthEnd.toISOString()),
    // Verdade financeira (Fase 0): vendido × recebido × a receber, somados
    // no banco para não esbarrar no teto de linhas do PostgREST.
    supabase.rpc("income_summary", {
      p_barbershop: tenant.id,
      p_from: monthStart.toISOString(),
      p_to: monthEnd.toISOString(),
    }),
    // Receitas pendentes: o que foi vendido e ainda não recebido.
    supabase
      .from("financial_transactions")
      .select("id,description,amount,category,created_at")
      .eq("barbershop_id", tenant.id)
      .eq("type", "income")
      .in("status", ["pending", "overdue"])
      .order("created_at", { ascending: false })
      .limit(100),
    // Atendimentos concluídos no mês (contagem real, independe do pagamento).
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("barbershop_id", tenant.id)
      .eq("status", "completed")
      .gte("starts_at", monthStart.toISOString())
      .lt("starts_at", monthEnd.toISOString()),
  ]);

  const summary0 = Array.isArray(summaryRows) ? summaryRows[0] : summaryRows;
  const soldMonth = Number(summary0?.sold ?? 0);
  const receivedMonth = Number(summary0?.received ?? 0);
  const receivableTotal = Number(summary0?.receivable ?? 0);
  const receivables = receivableRows ?? [];

  const byProfessional = new Map<string, ProfessionalAgg>();
  const byService = new Map<string, ServiceAgg>();
  const byProduct = new Map<string, ProductAgg>();

  const professionalEntry = (id: string, name: string) => {
    const current = byProfessional.get(id) ?? {
      name,
      count: 0,
      service: 0,
      product: 0,
      total: 0,
    };
    byProfessional.set(id, current);
    return current;
  };

  for (const row of incomeRows ?? []) {
    const amount = Number(row.amount);
    const appt = first(row.appointment);
    if (!appt) continue;
    const professional = first(appt.professional);
    if (professional) {
      const entry = professionalEntry(professional.id, professional.name);
      entry.count += 1;
      entry.service += amount;
      entry.total += amount;
    }
    const service = first(appt.service);
    if (service) {
      const current = byService.get(service.id) ?? {
        name: service.name,
        count: 0,
        revenue: 0,
      };
      current.count += 1;
      current.revenue += amount;
      byService.set(service.id, current);
    }
  }

  for (const row of saleRows ?? []) {
    const revenue = Number(row.quantity) * Number(row.unit_price);
    const name = first(row.product)?.name ?? "Produto";
    const current = byProduct.get(name) ?? { name, qty: 0, revenue: 0 };
    current.qty += Number(row.quantity);
    current.revenue += revenue;
    byProduct.set(name, current);
    const professional = first(first(row.appointment)?.professional);
    if (professional) {
      const entry = professionalEntry(professional.id, professional.name);
      entry.product += revenue;
      entry.total += revenue;
    }
  }

  const monthBuckets = new Map<string, { service: number; product: number }>(
    chartMonths.map((m) => [m.key, { service: 0, product: 0 }]),
  );
  for (const row of chartRows ?? []) {
    if (!row.paid_at) continue;
    const bucket = monthBuckets.get(monthKeyFmt.format(new Date(row.paid_at)));
    if (!bucket) continue;
    if (row.category === "product") bucket.product += Number(row.amount);
    else bucket.service += Number(row.amount);
  }
  const chartData: MonthlyRevenuePoint[] = chartMonths.map((m) => ({
    label: m.label,
    service: monthBuckets.get(m.key)?.service ?? 0,
    product: monthBuckets.get(m.key)?.product ?? 0,
  }));

  const professionals = [...byProfessional.values()].sort(
    (a, b) => b.total - a.total,
  );
  const services = [...byService.values()].sort(
    (a, b) => b.revenue - a.revenue,
  );
  const products = [...byProduct.values()].sort(
    (a, b) => b.revenue - a.revenue,
  );

  // Verdade financeira (Fase 0): vendido ≠ recebido. "Vendido" soma as
  // receitas criadas no mês (pagas ou não); "Recebido" soma o que foi pago
  // no mês; "A receber" é o saldo atual de receitas pendentes.
  const summary = [
    {
      label: "Vendido no mês",
      value: formatBRL(soldMonth),
      icon: TrendingUp,
      accent: true,
    },
    {
      label: "Recebido no mês",
      value: formatBRL(receivedMonth),
      icon: Wallet,
    },
    {
      label: "A receber",
      value: formatBRL(receivableTotal),
      icon: HandCoins,
      href: "#a-receber",
    },
    {
      label: "Atendimentos concluídos",
      value: String(completedCount ?? 0),
      icon: Users,
    },
  ];

  const dayAppointments = (appointmentRows ?? []).map((item) => {
    const service = first(item.service);
    const paid = (item.payments ?? []).some(
      (payment) =>
        payment.type === "income" &&
        payment.status === "paid" &&
        payment.category === "service",
    );
    return {
      id: item.id,
      clientName: first(item.client)?.name ?? "Cliente",
      professionalName: first(item.professional)?.name ?? "",
      serviceName: service?.name ?? "Serviço",
      amount: Number(service?.price ?? 0),
      status: item.status as string,
      paid,
    };
  });

  return (
    <>
      <PageHeader
        eyebrow="Financeiro"
        title="Financeiro"
        description={`${monthLabel.format(new Date(Date.UTC(year, month - 1, 1)))} — atendimento concluído vira venda a receber; o dinheiro só conta como recebido com a forma de pagamento.`}
        action={
          <div className="grid w-full grid-cols-2 items-center gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <Badge
              variant="outline"
              className="col-span-2 justify-center py-1.5 font-mono sm:col-auto sm:py-0.5"
            >
              Recebido no mês {formatBRL(receivedMonth)}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href="/comissoes">
                <HandCoins className="size-4" />
                <span className="truncate">Pagamento de Funcionários</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/relatorios">
                <ChartNoAxesCombined className="size-4" /> Relatórios
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="col-span-2 sm:col-auto"
            >
              <Link href="/relatorio-financeiro" target="_blank">
                <FileText className="size-4" /> Gerar PDF
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((metric) => {
          const content = (
            <Card
              className={
                metric.accent
                  ? "border-primary/40"
                  : metric.href
                    ? "hover:border-primary/50 transition-colors"
                    : undefined
              }
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {metric.label}
                </CardTitle>
                <metric.icon className="text-primary size-4" />
              </CardHeader>
              <CardContent>
                <p className="font-mono text-2xl font-semibold">
                  {metric.value}
                </p>
              </CardContent>
            </Card>
          );
          return metric.href ? (
            <Link key={metric.label} href={metric.href} className="block">
              {content}
            </Link>
          ) : (
            <div key={metric.label}>{content}</div>
          );
        })}
      </div>

      {receivables.length ? (
        <Card
          className="mt-6 scroll-mt-20 border-amber-300 dark:border-amber-900"
          id="a-receber"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HandCoins className="size-4" /> A receber ({receivables.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {receivables.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.description}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {item.category === "product" ? "Produto" : "Serviço"} ·
                    vendido em{" "}
                    {formatShortDateInTz(item.created_at, tenant.timezone)}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold">
                  {formatBRL(Number(item.amount))}
                </span>
                <form
                  action={confirmTransactionPayment}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="transactionId" value={item.id} />
                  <select
                    name="paymentMethod"
                    defaultValue="pix"
                    aria-label={`Forma de pagamento de ${item.description}`}
                    className="border-input bg-background h-8 rounded-lg border px-2 text-sm"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                  <Button size="sm">Receber</Button>
                </form>
                <form action={cancelPendingTransaction}>
                  <input type="hidden" name="transactionId" value={item.id} />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                  >
                    Cancelar venda
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            Evolução do recebido (6 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyRevenueChart data={chartData} />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scissors className="size-4" /> Serviços mais vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              items={services.slice(0, 5).map((item) => ({
                label: item.name,
                value: item.revenue,
                hint: `${item.count}x`,
              }))}
              empty="Nenhum serviço vendido."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-4" /> Produtos mais vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              items={products.slice(0, 5).map((item) => ({
                label: item.name,
                value: item.revenue,
                hint: `${item.qty} un`,
              }))}
              empty="Nenhum produto vendido."
            />
          </CardContent>
        </Card>
        <Card className="md:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4" /> Profissionais por vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              items={professionals.slice(0, 5).map((item) => ({
                label: item.name,
                value: item.total,
                hint: `${item.count} atend.`,
              }))}
              empty="Sem vendas neste mês."
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendas por profissional</CardTitle>
          </CardHeader>
          <CardContent>
            {professionals.length ? (
              <>
                {/* Celular: cards resumidos no lugar da tabela larga. */}
                <div className="space-y-3 sm:hidden">
                  {professionals.map((item) => (
                    <div key={item.name} className="rounded-xl border p-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="min-w-0 truncate font-medium">
                          {item.name}
                        </p>
                        <p className="shrink-0 font-mono font-semibold">
                          {formatBRL(item.total)}
                        </p>
                      </div>
                      <p className="text-muted-foreground mt-1.5 text-xs">
                        {item.count} atend. · Serviços {formatBRL(item.service)}{" "}
                        · Produtos {formatBRL(item.product)}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        Ticket médio{" "}
                        {formatBRL(item.count ? item.total / item.count : 0)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profissional</TableHead>
                        <TableHead className="text-right">Atend.</TableHead>
                        <TableHead className="text-right">Serviços</TableHead>
                        <TableHead className="text-right">Produtos</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">
                          Ticket médio
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {professionals.map((item) => (
                        <TableRow key={item.name}>
                          <TableCell className="font-medium">
                            {item.name}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {item.count}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatBRL(item.service)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatBRL(item.product)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatBRL(item.total)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-right font-mono">
                            {formatBRL(
                              item.count ? item.total / item.count : 0,
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Sem receitas neste mês ainda.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendas por serviço</CardTitle>
          </CardHeader>
          <CardContent>
            {services.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {item.count}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatBRL(item.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Sem serviços faturados neste mês.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 scroll-mt-20" id="vendas-produtos">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-4" /> Vendas de produtos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {products.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {item.qty.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatBRL(item.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Nenhum produto vendido neste mês. Confirme reservas em Produtos e
              Estoque.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="size-4" /> Atendimentos de hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dayAppointments.length ? (
            <>
              {/* Celular: um card por atendimento, com o pagamento em destaque
                — é a ação mais usada no balcão pelo telefone. */}
              <div className="space-y-3 sm:hidden">
                {dayAppointments.map((item) => (
                  <div key={item.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {item.clientName}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {item.serviceName}
                          {item.professionalName
                            ? ` · ${item.professionalName}`
                            : ""}
                        </p>
                      </div>
                      <p className="shrink-0 font-mono font-semibold">
                        {formatBRL(item.amount)}
                      </p>
                    </div>
                    <div className="mt-2">
                      <AppointmentStatusBadge status={item.status} />
                    </div>
                    <div className="mt-3 border-t pt-3">
                      {item.paid ? (
                        <div className="flex items-center justify-between gap-2">
                          <Badge className="border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                            Recebido
                          </Badge>
                          <form action={revertPayment}>
                            <input
                              type="hidden"
                              name="appointmentId"
                              value={item.id}
                            />
                            <Button size="sm" variant="ghost">
                              Estornar
                            </Button>
                          </form>
                        </div>
                      ) : (
                        <form
                          action={confirmPayment}
                          className="flex items-center gap-2"
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
                            className="border-input bg-background h-10 min-w-0 flex-1 rounded-lg border px-2 text-sm"
                          >
                            {PAYMENT_METHODS.map((method) => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </select>
                          <Button size="sm" className="h-10 shrink-0">
                            Confirmar
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden sm:block">
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
                    {dayAppointments.map((item) => (
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
                          </p>
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {formatBRL(item.amount)}
                        </TableCell>
                        <TableCell>
                          {item.paid ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                Recebido
                              </Badge>
                              <form action={revertPayment}>
                                <input
                                  type="hidden"
                                  name="appointmentId"
                                  value={item.id}
                                />
                                <Button size="sm" variant="ghost">
                                  Estornar
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
                                  <option
                                    key={method.value}
                                    value={method.value}
                                  >
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
              </div>
            </>
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
