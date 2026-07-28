import { Ban, Check, Trash2 } from "lucide-react";
import { formatBRL, PAYMENT_METHODS } from "@/lib/financial";
import { formatShortDateInTz } from "@/lib/dates";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type Bill = {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
};

export function BillsView({
  bills,
  today,
  timezone,
  settleLabel,
  settleAction,
  deleteAction,
  askPaymentMethod = false,
}: {
  bills: Bill[];
  today: string;
  timezone: string;
  settleLabel: string;
  settleAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
  /** Recebimentos exigem forma de pagamento (regra da Fase 0). */
  askPaymentMethod?: boolean;
}) {
  // "Em aberto" é pendente/vencido — não "tudo que não está pago". Desde a
  // Fase 0 o recebível acompanha a receita no Financeiro, e anular a venda por
  // lá deixa o lançamento como 'canceled': ele não é mais uma dívida do
  // cliente e não pode entrar na soma nem cobrar ninguém.
  const pending = bills
    .filter((bill) => bill.status === "pending" || bill.status === "overdue")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const paid = bills.filter((bill) => bill.status === "paid").slice(0, 10);
  const canceled = bills
    .filter((bill) => bill.status === "canceled")
    .slice(0, 10);
  const overdueTotal = pending
    .filter((bill) => bill.due_date < today)
    .reduce((total, bill) => total + Number(bill.amount), 0);
  const pendingTotal = pending.reduce(
    (total, bill) => total + Number(bill.amount),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Em aberto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-semibold">
              {formatBRL(pendingTotal)}
            </p>
          </CardContent>
        </Card>
        <Card
          className={overdueTotal > 0 ? "border-destructive/40" : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Vencido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`font-mono text-2xl font-semibold ${overdueTotal > 0 ? "text-destructive" : ""}`}
            >
              {formatBRL(overdueTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Em aberto ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length ? (
            <div className="space-y-2">
              {pending.map((bill) => {
                const overdue = bill.due_date < today;
                return (
                  <div
                    key={bill.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {bill.description}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Vence em{" "}
                        {formatShortDateInTz(
                          `${bill.due_date}T12:00:00Z`,
                          timezone,
                        )}
                      </p>
                    </div>
                    {overdue ? <Badge variant="danger">Vencida</Badge> : null}
                    <span className="font-mono text-sm font-semibold">
                      {formatBRL(Number(bill.amount))}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <form
                        action={settleAction}
                        className="flex items-center gap-1.5"
                      >
                        <input type="hidden" name="id" value={bill.id} />
                        {askPaymentMethod ? (
                          <select
                            name="paymentMethod"
                            defaultValue="pix"
                            aria-label={`Forma de pagamento de ${bill.description}`}
                            className="border-border-control bg-field focus-visible:border-focus-ring focus-visible:ring-focus-ring/45 h-12 rounded-lg border px-3 text-sm transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:h-11"
                          >
                            {PAYMENT_METHODS.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-success/40 text-success hover:bg-success-bg"
                        >
                          <Check className="size-3.5" /> {settleLabel}
                        </Button>
                      </form>
                      <form action={deleteAction}>
                        <input type="hidden" name="id" value={bill.id} />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          aria-label={`Excluir ${bill.description}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Nada em aberto"
              description="Os lançamentos pendentes aparecem aqui."
            />
          )}
        </CardContent>
      </Card>

      {paid.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Liquidadas recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {paid.map((bill) => (
              <div
                key={bill.id}
                className="text-muted-foreground flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm"
              >
                <Check className="text-success size-4" />
                <span className="min-w-0 flex-1 truncate">
                  {bill.description}
                </span>
                <span className="font-mono">
                  {formatBRL(Number(bill.amount))}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {canceled.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anuladas</CardTitle>
            <p className="text-muted-foreground text-sm">
              Lançamentos cancelados no Financeiro. Não entram no total em
              aberto e não devem ser cobrados.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {canceled.map((bill) => (
              <div
                key={bill.id}
                className="text-muted-foreground flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm"
              >
                <Ban className="size-4" />
                <span className="min-w-0 flex-1 truncate line-through">
                  {bill.description}
                </span>
                <span className="font-mono line-through">
                  {formatBRL(Number(bill.amount))}
                </span>
                <form action={deleteAction}>
                  <input type="hidden" name="id" value={bill.id} />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Excluir ${bill.description}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
