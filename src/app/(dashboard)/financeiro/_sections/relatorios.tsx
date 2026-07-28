import Link from "next/link";
import { FileText } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResolvedPeriod } from "@/lib/dates/period";
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
 * A origem dos recebimentos passa a respeitar o período escolhido — a rota
 * antiga somava a base inteira e chamava aquilo de "saldo total" (item 0.7).
 * Junto entra o mapa de calor, com a alternativa textual que o §6.2 exige.
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
  // O mapa de calor precisa de histórico para significar alguma coisa: uma
  // janela de um dia não desenha padrão nenhum. Usa no mínimo 90 dias
  // terminando no fim do período escolhido.
  const heatmapEnd = period.end;
  const heatmapStart = new Date(
    Math.min(period.start.getTime(), heatmapEnd.getTime() - 90 * DAY_MS),
  );

  const [{ data: paidRows }, { data: heatmapRows }] = await Promise.all([
    supabase
      .from("financial_transactions")
      .select("amount,payment_method")
      .eq("barbershop_id", tenantId)
      .eq("type", "income")
      .eq("status", "paid")
      .gte("paid_at", period.start.toISOString())
      .lt("paid_at", period.end.toISOString())
      .limit(1000),
    supabase.rpc("appointment_heatmap", {
      p_barbershop: tenantId,
      p_from: heatmapStart.toISOString(),
      p_to: heatmapEnd.toISOString(),
      p_timezone: timezone,
    }),
  ]);

  const paid = paidRows ?? [];
  const total = paid.reduce((sum, row) => sum + Number(row.amount), 0);
  const byMethod = new Map<string, number>();
  for (const row of paid) {
    const key = row.payment_method ?? "";
    byMethod.set(key, (byMethod.get(key) ?? 0) + Number(row.amount));
  }
  const methods = [...byMethod.entries()].sort((a, b) => b[1] - a[1]);

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

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Recebimentos por forma de pagamento — {period.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {methods.length ? (
              <>
                <p className="mb-4 font-mono text-2xl font-semibold">
                  {formatBRL(total)}
                </p>
                <div className="space-y-3">
                  {methods.map(([method, amount]) => {
                    const pct = total ? (amount / total) * 100 : 0;
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
              </>
            ) : (
              <EmptyState
                title="Sem recebimentos no período"
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
