import Link from "next/link";
import { FileText } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResolvedPeriod } from "@/lib/dates/period";
import { getUtcDayRange } from "@/lib/dates";
import { formatBRL, paymentMethodLabel } from "@/lib/financial";
import { EmptyState } from "@/components/feedback/empty-state";
import {
  OccupancyHeatmap,
  type HeatmapCell,
} from "@/components/dashboard/occupancy-heatmap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DAY_MS = 86_400_000;

/**
 * Relatórios (Fase 3 — itens 3.1 e 3.12).
 *
 * Os saldos vêm de `cash_summary` e a origem do dinheiro de
 * `income_by_payment_method`, ambas somadas no banco pela Fase 0 §0.7 — a
 * rota antiga pedia TODAS as receitas pagas sem limite e somava no cliente,
 * mostrando o saldo de uma barbearia menor da 1001ª transação em diante.
 *
 * O mapa de calor é o item 3.12, com a alternativa textual que o §6.2 exige.
 */
export async function RelatoriosSection({
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

  // O mapa de calor precisa de histórico para significar alguma coisa: uma
  // janela de um dia não desenha padrão nenhum. Usa no mínimo 90 dias
  // terminando no fim do período escolhido.
  const heatmapEnd = period.end;
  const heatmapStart = new Date(
    Math.min(period.start.getTime(), heatmapEnd.getTime() - 90 * DAY_MS),
  );

  const [{ data: cashRows }, { data: methodRows }, { data: heatmapRows }] =
    await Promise.all([
      supabase.rpc("cash_summary", {
        p_barbershop: tenantId,
        p_day_from: dayStart.toISOString(),
        p_day_to: dayEnd.toISOString(),
        p_month_from: period.start.toISOString(),
        p_month_to: period.end.toISOString(),
      }),
      supabase.rpc("income_by_payment_method", { p_barbershop: tenantId }),
      supabase.rpc("appointment_heatmap", {
        p_barbershop: tenantId,
        p_from: heatmapStart.toISOString(),
        p_to: heatmapEnd.toISOString(),
        p_timezone: timezone,
      }),
    ]);

  const cash = Array.isArray(cashRows) ? cashRows[0] : cashRows;
  const saldoTotal = Number(cash?.total ?? 0);
  const saldoDia = Number(cash?.day_total ?? 0);
  const saldoPeriodo = Number(cash?.month_total ?? 0);

  // Sem método registrado (dados anteriores à Fase 0) → "Não informado",
  // nunca somado como se fosse "Outro".
  const methods: Array<[string, number]> = (
    (methodRows ?? []) as Array<{
      payment_method: string | null;
      total: number | string;
    }>
  ).map((row) => [row.payment_method ?? "", Number(row.total)]);

  const cells: HeatmapCell[] = ((heatmapRows ?? []) as HeatmapCell[]).map(
    (row) => ({
      weekday: Number(row.weekday),
      hour: Number(row.hour),
      appointments: Number(row.appointments),
    }),
  );
  const heatmapWeeks = Math.max(
    1,
    Math.round((heatmapEnd.getTime() - heatmapStart.getTime()) / (7 * DAY_MS)),
  );
  const heatmapMonths = Math.max(
    1,
    Math.round((heatmapEnd.getTime() - heatmapStart.getTime()) / (30 * DAY_MS)),
  );

  const metrics = [
    { label: "Recebido hoje", value: formatBRL(saldoDia), accent: true },
    { label: `Recebido em ${period.label}`, value: formatBRL(saldoPeriodo) },
    { label: "Recebido desde sempre", value: formatBRL(saldoTotal) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map((metric) => (
          <Card
            key={metric.label}
            className={metric.accent ? "border-primary/40" : undefined}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-2xl font-semibold">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Recebimentos por forma de pagamento
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Todo o histórico recebido, não só o período escolhido.
            </p>
          </CardHeader>
          <CardContent>
            {methods.length ? (
              <div className="space-y-3">
                {methods.map(([method, amount]) => {
                  const pct = saldoTotal ? (amount / saldoTotal) * 100 : 0;
                  return (
                    <div key={method}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span>{paymentMethodLabel(method)}</span>
                        <span className="font-mono font-medium">
                          {formatBRL(amount)}{" "}
                          <span className="text-muted-foreground">
                            ({pct.toFixed(0)}%)
                          </span>
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
                description="Confirme pagamentos no caixa para alimentar os relatórios."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relatório em PDF</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Gera o fechamento do mês corrente em uma página, pronta para
              imprimir ou mandar para o contador.
            </p>
            <Button asChild variant="outline">
              <Link href="/relatorio-financeiro" target="_blank">
                <FileText className="size-4" /> Gerar PDF
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Movimento por dia e horário
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Últimos {heatmapMonths === 1 ? "30 dias" : `${heatmapMonths} meses`}{" "}
            de atendimentos confirmados e concluídos. É onde se decide horário
            de abertura, escala da equipe e promoção de dia fraco.
          </p>
        </CardHeader>
        <CardContent>
          <OccupancyHeatmap cells={cells} weeks={heatmapWeeks} />
        </CardContent>
      </Card>
    </div>
  );
}
