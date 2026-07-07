"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types/domain";

const billSchema = z.object({
  description: z.string().trim().min(2).max(200),
  amount: z.coerce.number().positive().max(9999999),
  dueDate: z.iso.date(),
});

type BillKind = "payable" | "receivable";

const config: Record<
  BillKind,
  {
    table: "accounts_payable" | "accounts_receivable";
    transactionType: "expense" | "income";
    category: string;
    path: string;
  }
> = {
  payable: {
    table: "accounts_payable",
    transactionType: "expense",
    category: "conta_a_pagar",
    path: "/contas-a-pagar",
  },
  receivable: {
    table: "accounts_receivable",
    transactionType: "income",
    category: "conta_a_receber",
    path: "/contas-a-receber",
  },
};

async function createBill(
  kind: BillKind,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "finance:view")) {
    return { success: false, message: "Sem permissão para o financeiro." };
  }
  const parsed = billSchema.safeParse({
    description: formData.get("description"),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate"),
  });
  if (!parsed.success) {
    return { success: false, message: "Revise descrição, valor e vencimento." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from(config[kind].table).insert({
    barbershop_id: tenant.id,
    description: parsed.data.description,
    amount: parsed.data.amount,
    due_date: parsed.data.dueDate,
    status: "pending",
  });
  if (error) {
    return {
      success: false,
      message: "Não foi possível salvar. Tente de novo.",
    };
  }
  revalidatePath(config[kind].path);
  revalidatePath("/financeiro");
  return { success: true, message: "Lançamento criado." };
}

async function settleBill(kind: BillKind, formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "finance:view")) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createSupabaseServerClient();
  const { data: bill } = await supabase
    .from(config[kind].table)
    .select("id,description,amount,status")
    .eq("id", id)
    .eq("barbershop_id", tenant.id)
    .maybeSingle();
  if (!bill || bill.status === "paid") return;

  const { data: transaction } = await supabase
    .from("financial_transactions")
    .insert({
      barbershop_id: tenant.id,
      type: config[kind].transactionType,
      status: "paid",
      category: config[kind].category,
      description: bill.description,
      amount: bill.amount,
      paid_at: new Date().toISOString(),
      created_by: tenant.profileId,
    })
    .select("id")
    .single();

  await supabase
    .from(config[kind].table)
    .update({ status: "paid", transaction_id: transaction?.id ?? null })
    .eq("id", id)
    .eq("barbershop_id", tenant.id);

  revalidatePath(config[kind].path);
  revalidatePath("/financeiro");
  revalidatePath("/relatorios");
}

async function deleteBill(kind: BillKind, formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "finance:view")) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from(config[kind].table)
    .delete()
    .eq("id", id)
    .eq("barbershop_id", tenant.id)
    .eq("status", "pending");
  revalidatePath(config[kind].path);
}

export async function createPayable(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return createBill("payable", formData);
}

export async function settlePayable(formData: FormData) {
  return settleBill("payable", formData);
}

export async function deletePayable(formData: FormData) {
  return deleteBill("payable", formData);
}

export async function createReceivable(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return createBill("receivable", formData);
}

export async function settleReceivable(formData: FormData) {
  return settleBill("receivable", formData);
}

export async function deleteReceivable(formData: FormData) {
  return deleteBill("receivable", formData);
}
