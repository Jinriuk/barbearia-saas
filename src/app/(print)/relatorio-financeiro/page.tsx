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

/**
 * Retorno de `financial_report` e `income_by_day` (Fase 0 §0.7). Os valores
 * `numeric` do Postgres chegam como string no JSON, daí `number | string`.
 */
type Num = number | string;
type FinancialReport = {
  serviceRevenue?: Num;
  productRevenue?: Num;
  otherRevenue?: Num;
  attended?: Num;
  productUnits?: Num;
  clients?: Num;
  byMethod?: Array<{ method: string | null; total: Num }>;
  byProfessional?: Array<{
    name: string;
    count: Num;
    service: Num;
    product: Num;
    total: Num;
  }>;
  byService?: Array<{ name: string; count: Num; revenue: Num }>;
  byProduct?: Array<{ name: string; qty: Num; revenue: Num }>;
};
type IncomeByDayRow = { paid_on: string; category: string; total: Num };

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

  const { start, end, year, month } = getUtcMonthRange(tenant.timezone, mes);

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
  // Tudo somado no banco (Fase 0 §0.7). As três varreduras que ficavam aqui
  // não tinham limite: o PostgREST corta em ~1000 linhas e o PDF saía com o
  // número menor, impresso e arquivado sem nenhum aviso de corte.
  const [{ data: shopData }, { data: reportData }, { data: chartRows }] =
    await Promise.all([
      supabase
        .from("barbershops")
        .select("name,logo_url")
        .eq("id", tenant.id)
        .maybeSingle(),
      supabase.rpc("financial_report", {
        p_barbershop: tenant.id,
        p_from: start.toISOString(),
        p_to: end.toISOString(),
      }),
      supabase.rpc("income_by_day", {
        p_barbershop: tenant.id,
        p_from: chartStart.toISOString(),
        p_to: end.toISOString(),
        p_timezone: tenant.timezone,
      }),
    ]);

  const shopName = shopData?.name ?? tenant.name;
  const logoUrl = shopData?.logo_url ?? null;

  const report = (reportData ?? {}) as FinancialReport;
  const serviceRevenue = Number(report.serviceRevenue ?? 0);
  const productRevenue = Number(report.productRevenue ?? 0);
  const otherRevenue = Number(report.otherRevenue ?? 0);
  const attended = Number(report.attended ?? 0);
  const productUnits = Number(report.productUnits ?? 0);
  const clientCount = Number(report.clients ?? 0);

  // Sem método registrado (dados anteriores à Fase 0) → "Não informado".
  const byMethod = new Map<string, number>(
    (report.byMethod ?? []).map((row) => [row.method ?? "", Number(row.total)]),
  );

  const monthBuckets = new Map<string, { service: number; product: number }>(
    chartMonths.map((m) => [m.key, { service: 0, product: 0 }]),
  );
  for (const row of (chartRows ?? []) as IncomeByDayRow[]) {
    if (!row.paid_on) continue;
    // paid_on é `date` no fuso da barbearia: a chave sai do texto, sem Date.
    const bucket = monthBuckets.get(row.paid_on.slice(0, 7));
    if (!bucket) continue;
    if (row.category === "product") bucket.product += Number(row.total);
    else bucket.service += Number(row.total);
  }
  const chartData: MonthlyRevenuePoint[] = chartMonths.map((m) => ({
    label: m.label,
    service: monthBuckets.get(m.key)?.service ?? 0,
    product: monthBuckets.get(m.key)?.product ?? 0,
  }));

  // Já vêm ordenados do banco; o Number() normaliza o numeric do Postgres,
  // que chega como string no JSON.
  const professionals = (report.byProfessional ?? []).map((row) => ({
    name: row.name,
    count: Number(row.count),
    service: Number(row.service),
    product: Number(row.product),
    total: Number(row.total),
  }));
  const services = (report.byService ?? []).map((row) => ({
    name: row.name,
    count: Number(row.count),
    revenue: Number(row.revenue),
  }));
  const products = (report.byProduct ?? []).map((row) => ({
    name: row.name,
    qty: Number(row.qty),
    revenue: Number(row.revenue),
  }));
  const methods = [...byMethod.entries()].sort((a, b) => b[1] - a[1]);
  const grandTotal = serviceRevenue + productRevenue + otherRevenue;
  const serviceShare =
    grandTotal > 0 ? Math.round((serviceRevenue / grandTotal) * 100) : 0;
  const productShare =
    grandTotal > 0 ? Math.round((productRevenue / grandTotal) * 100) : 0;
  const topProfessional = professionals[0] ?? null;
  const ticketMedio = attended > 0 ? serviceRevenue / attended : 0;
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
    { label: "Clientes atendidos", value: String(clientCount) },
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
        <h2 className="mb-2 text-sm font-bold tracking-wide text-neutral-500 uppercase">
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
        rows={services.map((s) => [
          s.name,
          String(s.count),
          formatBRL(s.revenue),
        ])}
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

      <section className="mt-7 break-inside-avoid">
        <h2 className="mb-2 text-sm font-bold tracking-wide text-neutral-500 uppercase">
          Observações finais
        </h2>
        {grandTotal > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600">
            <li>
              Gasto médio por atendimento: {formatBRL(ticketMedio)} ({attended}{" "}
              atendimento{attended === 1 ? "" : "s"}).
            </li>
            <li>
              Serviços responderam por {serviceShare}% da receita e produtos por{" "}
              {productShare}% no período.
            </li>
            {topProfessional ? (
              <li>
                Maior receita por profissional: {topProfessional.name} (
                {formatBRL(topProfessional.total)}).
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">
            Sem receita registrada no período analisado.
          </p>
        )}
      </section>

      <footer className="mt-10 border-t pt-4 text-center text-xs text-neutral-400">
        {shopName} · Relatório gerado automaticamente pelo painel ·{" "}
        {generatedAt}
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
      <h2 className="mb-2 text-sm font-bold tracking-wide text-neutral-500 uppercase">
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
