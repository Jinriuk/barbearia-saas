import Link from "next/link";
import {
  HandCoins,
  PiggyBank,
  ReceiptText,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResolvedPeriod } from "@/lib/dates/period";
import { formatBRL } from "@/lib/financial";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadCashFlowSeries } from "./shared";

type Summary = {
  sold: number;
  received: number;
  receivable: number;
  expenses_paid: number;
  profit: number;
  commissions_accrued: number;
  profit_after_commissions: number;
};

function readSummary(rows: unknown): Summary {
  const row = (Array.isArray(rows) ? rows[0] : rows) as
    Record<string, unknown> | null | undefined;
  const num = (key: string) => Number(row?.[key] ?? 0);
  return {
    sold: num("sold"),
    received: num("received"),
    receivable: num("receivable"),
    expenses_paid: num("expenses_paid"),
    profit: num("profit"),
    commissions_accrued: num("commissions_accrued"),
    profit_after_commissions: num("profit_after_commissions"),
  };
}

/**
 * Resumo do Financeiro (Fase 3 — itens 3.1, 3.3 e 3.7).
 *
 * O item 3.7 aparece aqui em dois cartões deliberadamente separados: o lucro
 * de caixa (o que sobrou no bolso hoje) e o lucro depois da comissão (o que
 * de fato sobra quando a equipe for paga). Enquanto o dono não paga, o
 * primeiro fica inflado — e é o segundo que sustenta a promessa do G3,
 * "faturamento é o que entra, lucro é o que fica".
 */
export async function ResumoSection({
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
    { data: previousRows },
    { count: completedCount },
    series,
  ] = await Promise.all([
    supabase.rpc("income_summary", {
      p_barbershop: tenantId,
      p_from: period.start.toISOString(),
      p_to: period.end.toISOString(),
    }),
    supabase.rpc("income_summary", {
      p_barbershop: tenantId,
      p_from: period.previous.start.toISOString(),
      p_to: period.previous.end.toISOString(),
    }),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("barbershop_id", tenantId)
      .eq("status", "completed")
      .gte("starts_at", period.start.toISOString())
      .lt("starts_at", period.end.toISOString()),
    loadCashFlowSeries(supabase, tenantId, timezone, period),
  ]);

  const summary = readSummary(summaryRows);
  const previous = readSummary(previousRows);

  const compare = (current: number, before: number) => {
    if (!before) return null;
    const delta = Math.round(((current - before) / before) * 100);
    return `${delta >= 0 ? "+" : ""}${delta}% vs ${period.previousLabel}`;
  };

  const metrics = [
    {
      label: "Vendido no período",
      value: formatBRL(summary.sold),
      icon: TrendingUp,
      accent: true,
      hint: compare(summary.sold, previous.sold),
    },
    {
      label: "Recebido no período",
      value: formatBRL(summary.received),
      icon: Wallet,
      hint: compare(summary.received, previous.received),
    },
    {
      label: "Vendas a receber",
      value: formatBRL(summary.receivable),
      icon: HandCoins,
      // Saldo, não fluxo: ignora a janela por definição — o rótulo diz isso
      // em vez de fingir que respeita o período (item 0.11). E conta só as
      // vendas concluídas: o fiado lançado à mão ainda vive noutra tabela e
      // por isso não entra aqui (item 0.10, Fase 0). A seção "A receber"
      // mostra os dois lados com totais separados.
      hint: "Saldo de vendas concluídas — não inclui o fiado lançado à mão",
      href: `/financeiro?secao=a-receber`,
    },
    {
      label: "Despesas pagas",
      value: formatBRL(summary.expenses_paid),
      icon: ReceiptText,
      hint: compare(summary.expenses_paid, previous.expenses_paid),
    },
    {
      label: "Lucro de caixa",
      value: formatBRL(summary.profit),
      icon: PiggyBank,
      hint: "Recebido − despesas pagas",
    },
    {
      label: "Lucro depois da comissão",
      value: formatBRL(summary.profit_after_commissions),
      icon: PiggyBank,
      strongHint: true,
      hint: `Já descontando ${formatBRL(summary.commissions_accrued)} de comissão apurada`,
      href: `/financeiro?secao=comissoes`,
    },
    {
      label: "Atendimentos concluídos",
      value: String(completedCount ?? 0),
      icon: Users,
      hint: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const card = (
            <Card
              className={
                metric.accent
                  ? "border-primary/40 h-full"
                  : metric.href
                    ? "hover:border-primary/50 h-full transition-colors"
                    : "h-full"
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
                {metric.hint ? (
                  <p
                    className={
                      metric.strongHint
                        ? "text-foreground/80 mt-1 text-xs"
                        : "text-muted-foreground mt-1 text-xs"
                    }
                  >
                    {metric.hint}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          );
          return metric.href ? (
            <Link key={metric.label} href={metric.href} className="block">
              {card}
            </Link>
          ) : (
            <div key={metric.label}>{card}</div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Entrou e saiu — {period.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CashFlowChart data={series} previousLabel={period.previousLabel} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como ler estes números</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            <span className="text-foreground font-medium">Vendido</span> é o que
            foi fechado no período — inclui o que ainda não foi pago.{" "}
            <span className="text-foreground font-medium">Recebido</span> é o
            dinheiro que entrou de fato, com forma de pagamento informada.
          </p>
          <p>
            <span className="text-foreground font-medium">Lucro de caixa</span>{" "}
            é recebido menos despesas pagas. O{" "}
            <span className="text-foreground font-medium">
              lucro depois da comissão
            </span>{" "}
            desconta também o que a equipe produziu no período e ainda não
            recebeu — é o número que não te surpreende no dia do pagamento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
