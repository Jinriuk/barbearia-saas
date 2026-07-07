import Link from "next/link";
import { Package, Scissors, TrendingUp, Users, Wallet } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { getUtcDayRange, getUtcMonthRange } from "@/lib/dates";
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

  const [{ data: appointmentRows }, { data: monthIncomeRows }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          "id,starts_at,status,client:clients(name),professional:professionals(name),service:services(name,price),appointment_products(quantity,unit_price),payments:financial_transactions(type,status)",
        )
        .eq("barbershop_id", tenant.id)
        .gte("starts_at", dayStart.toISOString())
        .lt("starts_at", dayEnd.toISOString())
        .neq("status", "canceled")
        .order("starts_at"),
      supabase
        .from("financial_transactions")
        .select(
          "amount,paid_at,appointment:appointments(professional:professionals(id,name),service:services(id,name),appointment_products(product_id,quantity,unit_price,product:products(name)))",
        )
        .eq("barbershop_id", tenant.id)
        .eq("type", "income")
        .eq("status", "paid")
        .gte("paid_at", monthStart.toISOString())
        .lt("paid_at", monthEnd.toISOString()),
    ]);

  // ---- Agregados do mês -------------------------------------------------
  const byProfessional = new Map<string, ProfessionalAgg>();
  const byService = new Map<string, ServiceAgg>();
  const byProduct = new Map<string, ProductAgg>();
  let monthServiceRevenue = 0;
  let monthProductRevenue = 0;
  let monthOtherRevenue = 0;
  let attendedCount = 0;
  let productUnits = 0;

  for (const row of monthIncomeRows ?? []) {
    const total = Number(row.amount);
    const appt = first(row.appointment);
    if (!appt) {
      monthOtherRevenue += total;
      continue;
    }
    const products = appt.appointment_products ?? [];
    const productRevenue = products.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
      0,
    );
    const serviceRevenue = Math.max(total - productRevenue, 0);

    attendedCount += 1;
    monthServiceRevenue += serviceRevenue;
    monthProductRevenue += productRevenue;

    const professional = first(appt.professional);
    if (professional) {
      const current = byProfessional.get(professional.id) ?? {
        name: professional.name,
        count: 0,
        service: 0,
        product: 0,
        total: 0,
      };
      current.count += 1;
      current.service += serviceRevenue;
      current.product += productRevenue;
      current.total += total;
      byProfessional.set(professional.id, current);
    }

    const service = first(appt.service);
    if (service) {
      const current = byService.get(service.id) ?? {
        name: service.name,
        count: 0,
        revenue: 0,
      };
      current.count += 1;
      current.revenue += serviceRevenue;
      byService.set(service.id, current);
    }

    for (const item of products) {
      const quantity = Number(item.quantity);
      const revenue = quantity * Number(item.unit_price);
      productUnits += quantity;
      const key = item.product_id as string;
      const current = byProduct.get(key) ?? {
        name: first(item.product)?.name ?? "Produto",
        qty: 0,
        revenue: 0,
      };
      current.qty += quantity;
      current.revenue += revenue;
      byProduct.set(key, current);
    }
  }

  const professionals = [...byProfessional.values()].sort(
    (a, b) => b.total - a.total,
  );
  const services = [...byService.values()].sort((a, b) => b.revenue - a.revenue);
  const products = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue);
  const monthTotal =
    monthServiceRevenue + monthProductRevenue + monthOtherRevenue;

  const summary = [
    {
      label: "Receita de serviços",
      value: formatBRL(monthServiceRevenue),
      icon: Scissors,
      accent: true,
    },
    {
      label: "Receita de produtos",
      value: formatBRL(monthProductRevenue),
      icon: Package,
      href: "#vendas-produtos",
    },
    {
      label: "Atendimentos concluídos",
      value: String(attendedCount),
      icon: Users,
    },
    {
      label: "Produtos vendidos",
      value: productUnits.toLocaleString("pt-BR"),
      icon: TrendingUp,
    },
  ];

  // ---- Atendimentos de hoje (confirmação de pagamento) ------------------
  const dayAppointments = (appointmentRows ?? []).map((item) => {
    const service = first(item.service);
    const productsTotal = (item.appointment_products ?? []).reduce(
      (total, product) =>
        total + Number(product.quantity) * Number(product.unit_price),
      0,
    );
    const paid = (item.payments ?? []).some(
      (payment) => payment.type === "income" && payment.status === "paid",
    );
    return {
      id: item.id,
      clientName: first(item.client)?.name ?? "Cliente",
      professionalName: first(item.professional)?.name ?? "",
      serviceName: service?.name ?? "Serviço",
      productCount: (item.appointment_products ?? []).length,
      amount: Number(service?.price ?? 0) + productsTotal,
      status: item.status as string,
      paid,
    };
  });

  return (
    <>
      <PageHeader
        eyebrow="Financeiro"
        title="Financeiro"
        description={`Receitas de ${monthLabel.format(new Date(Date.UTC(year, month - 1, 1)))} — serviços concluídos e vendas entram automaticamente.`}
        action={
          <Badge variant="outline" className="font-mono">
            Total do mês {formatBRL(monthTotal)}
          </Badge>
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

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receitas por profissional</CardTitle>
          </CardHeader>
          <CardContent>
            {professionals.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead className="text-right">Atend.</TableHead>
                    <TableHead className="text-right">Serviços</TableHead>
                    <TableHead className="text-right">Produtos</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Ticket médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {professionals.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">{item.name}</TableCell>
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
                        {formatBRL(item.count ? item.total / item.count : 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Sem receitas neste mês ainda.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receitas por serviço</CardTitle>
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
              Nenhum produto vendido neste mês.
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
                {dayAppointments.map((item) => {
                  const paid = item.paid;
                  return (
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
                        {paid ? (
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
                  );
                })}
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
