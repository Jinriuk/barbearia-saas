import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { getUtcMonthRange } from "@/lib/dates";
import { formatBRL, paymentMethodLabel } from "@/lib/financial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  MonthlyRevenueChart,
  type MonthlyRevenuePoint,
} from "@/components/dashboard/monthly-revenue-chart";
import { PrintButton } from "@/components/dashboard/print-button";

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
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

export default async function FinancialReportPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const tenant = await requireTenant();
  if (!can(tenant.role, "finance:view")) notFound();

  const {
    start,
    end,
    year,
    month,
  } = getUtcMonthRange(tenant.timezone, mes);

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

  const supabase = await createSupabaseServerClient();
  const [{ data: shopData }, { data: incomeRows }, { data: chartRows }] =
    await Promise.all([
      supabase
        .from("barbershops")
        .select("name,logo_url")
        .eq("id", tenant.id)
        .maybeSingle(),
      supabase
        .from("financial_transactions")
        .select(
          "amount,paid_at,payment_method,appointment:appointments(client_id,professional:professionals(id,name),service:services(id,name),appointment_products(product_id,quantity,unit_price,product:products(name)))",
        )
        .eq("barbershop_id", tenant.id)
        .eq("type", "income")
        .eq("status", "paid")
        .gte("paid_at", start.toISOString())
        .lt("paid_at", end.toISOString()),
      supabase
        .from("financial_transactions")
        .select(
          "amount,paid_at,appointment:appointments(appointment_products(quantity,unit_price))",
        )
        .eq("barbershop_id", tenant.id)
        .eq("type", "income")
        .eq("status", "paid")
        .gte("paid_at", chartStart.toISOString())
        .lt("paid_at", end.toISOString()),
    ]);

  const shopName = shopData?.name ?? tenant.name;
  const logoUrl = shopData?.logo_url ?? null;

  const byProfessional = new Map<
    string,
    { name: string; count: number; service: number; product: number; total: number }
  >();
  const byService = new Map<string, { name: string; count: number; revenue: number }>();
  const byProduct = new Map<string, { name: string; qty: number; revenue: number }>();
  const byMethod = new Map<string, number>();
  const clientSet = new Set<string>();
  let serviceRevenue = 0;
  let productRevenue = 0;
  let otherRevenue = 0;
  let attended = 0;
  let productUnits = 0;

  for (const row of incomeRows ?? []) {
    const total = Number(row.amount);
    byMethod.set(
      row.payment_method ?? "other",
      (byMethod.get(row.payment_method ?? "other") ?? 0) + total,
    );
    const appt = first(row.appointment);
    if (!appt) {
      otherRevenue += total;
      continue;
    }
    const products = appt.appointment_products ?? [];
    const prodRev = products.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
      0,
    );
    const svcRev = Math.max(total - prodRev, 0);
    attended += 1;
    serviceRevenue += svcRev;
    productRevenue += prodRev;
    if (appt.client_id) clientSet.add(appt.client_id as string);

    const professional = first(appt.professional);
    if (professional) {
      const cur = byProfessional.get(professional.id) ?? {
        name: professional.name,
        count: 0,
        service: 0,
        product: 0,
        total: 0,
      };
      cur.count += 1;
      cur.service += svcRev;
      cur.product += prodRev;
      cur.total += total;
      byProfessional.set(professional.id, cur);
    }
    const service = first(appt.service);
    if (service) {
      const cur = byService.get(service.id) ?? {
        name: service.name,
        count: 0,
        revenue: 0,
      };
      cur.count += 1;
      cur.revenue += svcRev;
      byService.set(service.id, cur);
    }
    for (const item of products) {
      const qty = Number(item.quantity);
      productUnits += qty;
      const key = item.product_id as string;
      const cur = byProduct.get(key) ?? {
        name: first(item.product)?.name ?? "Produto",
        qty: 0,
        revenue: 0,
      };
      cur.qty += qty;
      cur.revenue += qty * Number(item.unit_price);
      byProduct.set(key, cur);
    }
  }

  const monthBuckets = new Map<string, { service: number; product: number }>(
    chartMonths.map((m) => [m.key, { service: 0, product: 0 }]),
  );
  for (const row of chartRows ?? []) {
    if (!row.paid_at) continue;
    const bucket = monthBuckets.get(monthKeyFmt.format(new Date(row.paid_at)));
    if (!bucket) continue;
    const appt = first(row.appointment);
    const prodRev = (appt?.appointment_products ?? []).reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
      0,
    );
    bucket.product += prodRev;
    bucket.service += Math.max(Number(row.amount) - prodRev, 0);
  }
  const chartData: MonthlyRevenuePoint[] = chartMonths.map((m) => ({
    label: m.label,
    service: monthBuckets.get(m.key)?.service ?? 0,
    product: monthBuckets.get(m.key)?.product ?? 0,
  }));

  const professionals = [...byProfessional.values()].sort((a, b) => b.total - a.total);
  const services = [...byService.values()].sort((a, b) => b.revenue - a.revenue);
  const products = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue);
  const methods = [...byMethod.entries()].sort((a, b) => b[1] - a[1]);
  const grandTotal = serviceRevenue + productRevenue + otherRevenue;
  const generatedAt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: tenant.timezone,
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  const summary = [
    { label: "Receita total", value: formatBRL(grandTotal), strong: true },
    { label: "Receita de serviços", value: formatBRL(serviceRevenue) },
    { label: "Receita de produtos", value: formatBRL(productRevenue) },
    { label: "Atendimentos concluídos", value: String(attended) },
    { label: "Clientes atendidos", value: String(clientSet.size) },
    { label: "Produtos vendidos", value: productUnits.toLocaleString("pt-BR") },
  ];

  return (
    <div className="mx-auto max-w-3xl px-8 py-10 print:px-0 print:py-0">
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      `}</style>

      <div className="mb-6 flex items-center justify-end">
        <PrintButton />
      </div>

      <header className="flex items-center justify-between gap-4 border-b-2 border-neutral-900 pb-5">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={shopName}
              className="h-14 w-14 rounded-lg object-cover"
            />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-neutral-900 text-lg font-bold text-white">
              {shopName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">{shopName}</h1>
            <p className="text-sm text-neutral-500">Relatório Financeiro</p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">
            {monthNames[month - 1]} de {year}
          </p>
          <p className="text-neutral-500">Gerado em {generatedAt}</p>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-3 gap-3">
        {summary.map((item) => (
          <div
            key={item.label}
            className={`rounded-lg border p-3 ${item.strong ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"}`}
          >
            <p className="text-xs text-neutral-500">{item.label}</p>
            <p className="mt-1 font-mono text-lg font-semibold">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="mt-7">
        <h2 className="mb-2 text-sm font-bold tracking-wide uppercase text-neutral-500">
          Evolução da receita (6 meses)
        </h2>
        <MonthlyRevenueChart data={chartData} />
      </section>

      <ReportTable
        title="Receitas por profissional"
        head={["Profissional", "Atend.", "Serviços", "Produtos", "Total"]}
        rows={professionals.map((p) => [
          p.name,
          String(p.count),
          formatBRL(p.service),
          formatBRL(p.product),
          formatBRL(p.total),
        ])}
        empty="Sem receitas no período."
      />

      <ReportTable
        title="Receitas por serviço"
        head={["Serviço", "Qtd.", "Receita"]}
        rows={services.map((s) => [s.name, String(s.count), formatBRL(s.revenue)])}
        empty="Nenhum serviço faturado."
      />

      <ReportTable
        title="Vendas de produtos"
        head={["Produto", "Unidades", "Receita"]}
        rows={products.map((p) => [
          p.name,
          p.qty.toLocaleString("pt-BR"),
          formatBRL(p.revenue),
        ])}
        empty="Nenhum produto vendido."
      />

      <ReportTable
        title="Recebimentos por forma de pagamento"
        head={["Forma", "Valor"]}
        rows={methods.map(([method, amount]) => [
          paymentMethodLabel(method),
          formatBRL(amount),
        ])}
        empty="Sem recebimentos."
      />

      <footer className="mt-10 border-t pt-4 text-center text-xs text-neutral-400">
        {shopName} · Relatório gerado automaticamente pelo painel · {generatedAt}
      </footer>
    </div>
  );
}

function ReportTable({
  title,
  head,
  rows,
  empty,
}: {
  title: string;
  head: string[];
  rows: string[][];
  empty: string;
}) {
  return (
    <section className="mt-7 break-inside-avoid">
      <h2 className="mb-2 text-sm font-bold tracking-wide uppercase text-neutral-500">
        {title}
      </h2>
      {rows.length ? (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-left text-neutral-500">
              {head.map((cell, index) => (
                <th
                  key={cell}
                  className={`py-1.5 font-medium ${index === 0 ? "" : "text-right"}`}
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-neutral-100">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`py-1.5 ${cellIndex === 0 ? "font-medium" : "text-right font-mono"}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-neutral-400">{empty}</p>
      )}
    </section>
  );
}
