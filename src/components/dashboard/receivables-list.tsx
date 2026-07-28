import { Check, MessageCircle, Trash2 } from "lucide-react";
import { formatBRL, PAYMENT_METHODS } from "@/lib/financial";
import { formatShortDateInTz } from "@/lib/dates";
import { whatsAppHref } from "@/lib/contact";
import { deleteReceivable, settleReceivable } from "@/modules/bills/actions";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ReceivableRow = {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
  notes: string | null;
  clientName: string | null;
  clientPhone: string | null;
};

/**
 * Lista de "A receber" com dono e cobrança (Fase 3 — item 3.6).
 *
 * O texto da cobrança é montado aqui, uma vez, e chega editável no WhatsApp:
 * quem cobra é o dono, não o sistema. Sem cliente vinculado a linha continua
 * existindo — só não tem para quem mandar, e a tela diz isso.
 */
export function ReceivablesList({
  rows,
  today,
  timezone,
  businessName,
}: {
  rows: ReceivableRow[];
  today: string;
  timezone: string;
  businessName: string;
}) {
  const pending = rows
    .filter((row) => row.status !== "paid")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const settled = rows.filter((row) => row.status === "paid").slice(0, 10);

  const chargeHref = (row: ReceivableRow) => {
    const href = whatsAppHref(row.clientPhone);
    if (!href) return null;
    const firstName = (row.clientName ?? "").trim().split(/\s+/)[0];
    const due = formatShortDateInTz(`${row.due_date}T12:00:00Z`, timezone);
    const text = `Oi${firstName ? ` ${firstName}` : ""}, tudo bem? Aqui é da ${businessName}. Passando para lembrar do valor de ${formatBRL(Number(row.amount))} referente a ${row.description}, com vencimento em ${due}. Qualquer coisa é só chamar por aqui.`;
    return `${href}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Em aberto ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length ? (
            <div className="space-y-2">
              {pending.map((row) => {
                const overdue = row.due_date < today;
                const href = chargeHref(row);
                return (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {row.clientName ?? "Sem cliente vinculado"}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {row.description} · vence em{" "}
                        {formatShortDateInTz(
                          `${row.due_date}T12:00:00Z`,
                          timezone,
                        )}
                      </p>
                      {row.notes ? (
                        <p className="text-muted-foreground mt-0.5 truncate text-xs italic">
                          {row.notes}
                        </p>
                      ) : null}
                    </div>
                    {overdue ? (
                      <Badge className="border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                        Vencida
                      </Badge>
                    ) : null}
                    <span className="font-mono text-sm font-semibold">
                      {formatBRL(Number(row.amount))}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {href ? (
                        <Button asChild size="sm" variant="outline">
                          <a href={href} target="_blank" rel="noopener">
                            <MessageCircle className="size-3.5" /> Cobrar no
                            WhatsApp
                          </a>
                        </Button>
                      ) : null}
                      <form
                        action={settleReceivable}
                        className="flex items-center gap-1.5"
                      >
                        <input type="hidden" name="id" value={row.id} />
                        <select
                          name="paymentMethod"
                          defaultValue="pix"
                          aria-label={`Forma de pagamento de ${row.description}`}
                          className="border-input bg-background h-8 rounded-lg border px-2 text-xs"
                        >
                          {PAYMENT_METHODS.map((method) => (
                            <option key={method.value} value={method.value}>
                              {method.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-900 dark:text-emerald-400"
                        >
                          <Check className="size-3.5" /> Recebi
                        </Button>
                      </form>
                      <form action={deleteReceivable}>
                        <input type="hidden" name="id" value={row.id} />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          aria-label={`Excluir ${row.description}`}
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
              description="Fiado, convênio e pacote combinado aparecem aqui até serem recebidos."
            />
          )}
        </CardContent>
      </Card>

      {settled.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recebidos recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {settled.map((row) => (
              <div
                key={row.id}
                className="text-muted-foreground flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm"
              >
                <Check className="size-4 text-emerald-600" />
                <span className="min-w-0 flex-1 truncate">
                  {row.clientName ? `${row.clientName} — ` : ""}
                  {row.description}
                </span>
                <span className="font-mono">
                  {formatBRL(Number(row.amount))}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
