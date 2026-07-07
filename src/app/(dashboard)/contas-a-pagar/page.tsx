import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { getDateInTz } from "@/lib/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createPayable,
  deletePayable,
  settlePayable,
} from "@/modules/bills/actions";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { BillForm } from "@/components/dashboard/bill-form";
import { BillsView, type Bill } from "@/components/dashboard/bills-view";

export default async function PayablesPage() {
  const tenant = await requireTenant();

  if (!can(tenant.role, "finance:view")) {
    return (
      <>
        <PageHeader
          eyebrow="Financeiro"
          title="Contas a pagar"
          description="Despesas e vencimentos da barbearia."
        />
        <EmptyState
          title="Acesso restrito"
          description="Apenas o proprietário acessa as contas."
        />
      </>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("accounts_payable")
    .select("id,description,amount,due_date,status")
    .eq("barbershop_id", tenant.id)
    .order("due_date")
    .limit(300);

  return (
    <>
      <PageHeader
        eyebrow="Financeiro"
        title="Contas a pagar"
        description="Aluguel, fornecedores e despesas: registre e dê baixa ao pagar."
      />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <BillForm title="Nova conta a pagar" action={createPayable} />
        <BillsView
          bills={(data ?? []) as Bill[]}
          today={getDateInTz(tenant.timezone)}
          timezone={tenant.timezone}
          settleLabel="Pagar"
          settleAction={settlePayable}
          deleteAction={deletePayable}
        />
      </div>
    </>
  );
}
