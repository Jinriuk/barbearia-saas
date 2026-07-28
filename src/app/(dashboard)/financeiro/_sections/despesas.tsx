import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResolvedPeriod } from "@/lib/dates/period";
import { getDateInTz } from "@/lib/dates";
import { formatBRL } from "@/lib/financial";
import { deletePayable, settlePayable } from "@/modules/bills/actions";
import { ExpenseForm } from "@/components/dashboard/expense-form";
import { BillsView, type Bill } from "@/components/dashboard/bills-view";
import { BarList } from "@/components/dashboard/bar-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Despesas (Fase 3 — itens 3.1 e 3.5).
 *
 * Deixa de ser uma rota solta no menu e passa a ser seção do Financeiro,
 * com formulário próprio e progressivo. "Para onde foi o dinheiro" só tem
 * resposta porque agora existe categoria.
 */
export async function DespesasSection({
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
  const [{ data: billRows }, { data: paidRows }] = await Promise.all([
    supabase
      .from("accounts_payable")
      .select("id,description,amount,due_date,status,category,notes")
      .eq("barbershop_id", tenantId)
      .order("due_date")
      .limit(300),
    // Despesas efetivamente pagas no período, para o corte por categoria.
    supabase
      .from("financial_transactions")
      .select("amount,category,description")
      .eq("barbershop_id", tenantId)
      .eq("type", "expense")
      .eq("status", "paid")
      .gte("paid_at", period.start.toISOString())
      .lt("paid_at", period.end.toISOString())
      .limit(1000),
  ]);

  const bills = (billRows ?? []) as Bill[];

  // Corte por categoria: a conta a pagar guarda a categoria escolhida; a
  // transação guarda a natureza técnica ('salary', 'conta_a_pagar'…). Casar
  // as duas por descrição é frágil, então o corte usa o que já está
  // classificado nas contas e agrupa o resto em "Outras saídas".
  const categoryByDescription = new Map(
    bills
      .filter((bill) => bill.category)
      .map((bill) => [bill.description, bill.category as string]),
  );
  const byCategory = new Map<string, number>();
  for (const row of paidRows ?? []) {
    const label =
      row.category === "salary"
        ? "Equipe (salários, comissões e vales)"
        : (categoryByDescription.get(row.description ?? "") ?? "Outras saídas");
    byCategory.set(label, (byCategory.get(label) ?? 0) + Number(row.amount));
  }
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const totalPaid = categories.reduce((total, [, value]) => total + value, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Para onde foi o dinheiro — {period.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length ? (
            <>
              <p className="mb-3 font-mono text-2xl font-semibold">
                {formatBRL(totalPaid)}
              </p>
              <BarList
                items={categories.map(([label, value]) => ({
                  label,
                  value,
                }))}
                empty="Nenhuma despesa paga no período."
              />
            </>
          ) : (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Nenhuma despesa paga no período escolhido.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <ExpenseForm />
        <BillsView
          bills={bills}
          today={getDateInTz(timezone)}
          timezone={timezone}
          settleLabel="Paguei"
          settleAction={settlePayable}
          deleteAction={deletePayable}
        />
      </div>
    </div>
  );
}
