import Link from "next/link";
import { HandCoins } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatShortDateInTz, getDateInTz } from "@/lib/dates";
import { formatBRL, PAYMENT_METHODS } from "@/lib/financial";
import {
  cancelPendingTransaction,
  confirmTransactionPayment,
} from "@/modules/financial/actions";
import { EmptyState } from "@/components/feedback/empty-state";
import {
  ReceivableForm,
  type ReceivableClientOption,
} from "@/components/dashboard/receivable-form";
import {
  ReceivablesList,
  type ReceivableRow,
} from "@/components/dashboard/receivables-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { first } from "./shared";

const PAGE_SIZE = 25;

/**
 * Rótulo da linha em "A receber". Era binário (produto ou serviço) e passou a
 * mentir quando o fiado e a mensalidade de plano entraram na mesma lista
 * (Fase 0 §0.10): "Fiado do João" aparecia como "Serviço", sugerindo um
 * atendimento que não existe.
 */
function incomeCategoryLabel(category: string): string {
  switch (category) {
    case "product":
      return "Produto";
    case "service":
      return "Serviço";
    case "conta_a_receber":
      return "Fiado";
    case "membership":
      return "Plano do cliente";
    default:
      return "Outros";
  }
}

/**
 * A receber (Fase 3 — itens 3.1 e 3.6).
 *
 * Duas origens, cada uma com o seu total explícito:
 *  · Vendas concluídas ainda não pagas (transações pendentes).
 *  · Fiado e acertos lançados à mão, agora COM DONO e com cobrança por
 *    WhatsApp.
 *
 * A lista de vendas era capada em 100 com o título anunciando "(100)" como
 * se fosse o total (item 0.12). Agora é paginada e o número no título é a
 * contagem real do banco.
 */
export async function AReceberSection({
  supabase,
  tenantId,
  timezone,
  businessName,
  page,
  sectionQuery,
}: {
  supabase: SupabaseClient;
  tenantId: string;
  timezone: string;
  businessName: string;
  page: number;
  /** Query base para os links de paginação (seção + período). */
  sectionQuery: string;
}) {
  const from = (page - 1) * PAGE_SIZE;

  const [
    { data: transactionRows, count: transactionCount },
    { data: manualRows },
    { data: clientRows },
  ] = await Promise.all([
    supabase
      .from("financial_transactions")
      .select("id,description,amount,category,created_at", { count: "exact" })
      .eq("barbershop_id", tenantId)
      .eq("type", "income")
      .in("status", ["pending", "overdue"])
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
    supabase
      .from("accounts_receivable")
      .select(
        "id,description,amount,due_date,status,notes,client:clients(name,phone)",
      )
      .eq("barbershop_id", tenantId)
      .order("due_date")
      .limit(300),
    supabase
      .from("clients")
      .select("id,name")
      .eq("barbershop_id", tenantId)
      .eq("active", true)
      .order("name")
      .limit(500),
  ]);

  const transactions = transactionRows ?? [];
  const total = transactionCount ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const manual: ReceivableRow[] = (manualRows ?? []).map((row) => {
    const client = first(row.client);
    return {
      id: row.id,
      description: row.description,
      amount: Number(row.amount),
      due_date: row.due_date,
      status: row.status,
      notes: row.notes ?? null,
      clientName: client?.name ?? null,
      clientPhone: client?.phone ?? null,
    };
  });

  const manualOpen = manual
    .filter((row) => row.status !== "paid")
    .reduce((sum, row) => sum + row.amount, 0);

  const clients = (clientRows ?? []) as ReceivableClientOption[];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <HandCoins className="size-4" /> A receber (
              {total})
            </span>
            {total > PAGE_SIZE ? (
              <span className="text-muted-foreground text-xs font-normal">
                Página {page} de {lastPage}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {transactions.length ? (
            <>
              {transactions.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.description}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {incomeCategoryLabel(item.category)} · vendido em{" "}
                      {formatShortDateInTz(item.created_at, timezone)}
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
                      className="border-input bg-background h-9 rounded-lg border px-2 text-sm"
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                    <Button size="sm">Recebi</Button>
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

              {lastPage > 1 ? (
                <div className="flex items-center justify-between pt-2">
                  <Button
                    asChild={page > 1}
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                  >
                    {page > 1 ? (
                      <Link
                        href={`/financeiro?${sectionQuery}&pagina=${page - 1}`}
                      >
                        ← Anteriores
                      </Link>
                    ) : (
                      <span>← Anteriores</span>
                    )}
                  </Button>
                  <Button
                    asChild={page < lastPage}
                    size="sm"
                    variant="outline"
                    disabled={page >= lastPage}
                  >
                    {page < lastPage ? (
                      <Link
                        href={`/financeiro?${sectionQuery}&pagina=${page + 1}`}
                      >
                        Próximas →
                      </Link>
                    ) : (
                      <span>Próximas →</span>
                    )}
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="Nada pendente"
              description="Todo atendimento concluído já foi recebido."
            />
          )}
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Fiado e acertos</h2>
          <p className="text-muted-foreground text-sm">
            Em aberto:{" "}
            <span className="text-foreground font-mono font-semibold">
              {formatBRL(manualOpen)}
            </span>
          </p>
        </div>
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <ReceivableForm clients={clients} />
          <ReceivablesList
            rows={manual}
            today={getDateInTz(timezone)}
            timezone={timezone}
            businessName={businessName}
          />
        </div>
      </div>
    </div>
  );
}
