import { Package, Scissors, TrendingUp, Wallet } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResolvedPeriod } from "@/lib/dates/period";
import { getUtcDayRange } from "@/lib/dates";
import { formatBRL, PAYMENT_METHODS } from "@/lib/financial";
import { confirmPayment, revertPayment } from "@/modules/financial/actions";
import { EmptyState } from "@/components/feedback/empty-state";
import { AppointmentStatusBadge } from "@/components/dashboard/appointment-status-badge";
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
import { first } from "./shared";

/** Linhas de `revenue_breakdown` (Fase 0 §0.7 + Fase 2.6). */
type BreakdownRow = {
  kind: "professional" | "service" | "product" | "product_professional";
  ref_id: string;
  label: string;
  total: number | string;
  quantity: number | string;
};

type ProfessionalAgg = {
  id: string;
  name: string;
  count: number;
  service: number;
  product: number;
  total: number;
};

const selectClass =
  "border-border-control bg-field focus-visible:border-focus-ring focus-visible:ring-focus-ring/45 h-12 rounded-lg border px-3 text-sm transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:h-11";

/**
 * Caixa e vendas (Fase 3 — item 3.1 / §7.5).
 *
 * Junta o que o balcão usa (receber o atendimento de hoje) com o que o dono
 * confere (quem vendeu o quê no período). As agregações vêm de
 * `revenue_breakdown`, somadas no banco — a Fase 0 §0.7 tirou daqui as três
 * varreduras sem limite que o PostgREST cortava em ~1000 linhas, e a Fase
 * 2.6 fez a mesma função enxergar a venda de balcão. Esta seção herda as
 * duas: nenhum total é somado no cliente.
 */
export async function CaixaSection({
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
  const { start: dayStart, end: dayEnd } = getUtcDayRange(timezone);

  const [{ data: appointmentRows }, { data: breakdownRows }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          "id,starts_at,status,client:clients(name),professional:professionals(name),service:services(name,price),charged_price,payments:financial_transactions(category,type,status)",
        )
        .eq("barbershop_id", tenantId)
        .gte("starts_at", dayStart.toISOString())
        .lt("starts_at", dayEnd.toISOString())
        .neq("status", "canceled")
        .order("starts_at"),
      supabase.rpc("revenue_breakdown", {
        p_barbershop: tenantId,
        p_from: period.start.toISOString(),
        p_to: period.end.toISOString(),
      }),
    ]);

  const rows = (breakdownRows ?? []) as BreakdownRow[];

  const byProfessional = new Map<string, ProfessionalAgg>();
  const professionalEntry = (id: string, name: string) => {
    const current = byProfessional.get(id) ?? {
      id,
      name,
      count: 0,
      service: 0,
      product: 0,
      total: 0,
    };
    byProfessional.set(id, current);
    return current;
  };

  const services: Array<{ name: string; count: number; revenue: number }> = [];
  const products: Array<{ name: string; qty: number; revenue: number }> = [];

  for (const row of rows) {
    const total = Number(row.total);
    const quantity = Number(row.quantity);
    if (row.kind === "professional") {
      const entry = professionalEntry(row.ref_id, row.label);
      entry.service += total;
      entry.total += total;
      entry.count += quantity;
    } else if (row.kind === "product_professional") {
      const entry = professionalEntry(row.ref_id, row.label);
      entry.product += total;
      entry.total += total;
    } else if (row.kind === "service") {
      services.push({ name: row.label, count: quantity, revenue: total });
    } else if (row.kind === "product") {
      products.push({ name: row.label, qty: quantity, revenue: total });
    }
  }

  const professionals = [...byProfessional.values()].sort(
    (a, b) => b.total - a.total,
  );
  services.sort((a, b) => b.revenue - a.revenue);
  products.sort((a, b) => b.revenue - a.revenue);

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
      // Concluído mostra o valor congelado (Fase 0 §0.9); o que ainda não
      // concluiu não tem valor congelado e usa o preço de catálogo.
      amount: Number(item.charged_price ?? service?.price ?? 0),
      status: item.status as string,
      paid,
    };
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-4" /> Atendimentos de hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dayAppointments.length ? (
            <>
              <div className="space-y-3 sm:hidden">
                {dayAppointments.map((item) => (
                  <div key={item.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.clientName}</p>
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
                          <Badge variant="success">Recebido</Badge>
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
                            className={`${selectClass} min-w-0 flex-1`}
                          >
                            {PAYMENT_METHODS.map((method) => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </select>
                          <Button size="sm" className="shrink-0">
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
                              <Badge variant="success">Recebido</Badge>
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
                                className={selectClass}
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

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
              empty="Sem vendas no período."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendas por profissional</CardTitle>
        </CardHeader>
        <CardContent>
          {professionals.length ? (
            <>
              <div className="space-y-3 sm:hidden">
                {professionals.map((item) => (
                  <div key={item.id} className="rounded-xl border p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="min-w-0 truncate font-medium">
                        {item.name}
                      </p>
                      <p className="shrink-0 font-mono font-semibold">
                        {formatBRL(item.total)}
                      </p>
                    </div>
                    <p className="text-muted-foreground mt-1.5 text-xs">
                      {item.count} atend. · Serviços {formatBRL(item.service)} ·
                      Produtos {formatBRL(item.product)}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Gasto médio por cliente{" "}
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
                        Gasto médio por cliente
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {professionals.map((item) => (
                      <TableRow key={item.id}>
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
                          {formatBRL(item.count ? item.total / item.count : 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Sem receitas no período escolhido.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
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
                Sem serviços faturados no período.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
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
                Nenhum produto vendido no período. As vendas de balcão e as
                reservas confirmadas no agendamento aparecem aqui.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
