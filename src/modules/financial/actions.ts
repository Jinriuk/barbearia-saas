"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const paymentMethodSchema = z.enum(["cash", "card", "pix", "other"]);

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function revalidate() {
  revalidatePath("/financeiro");
  revalidatePath("/relatorios");
  revalidatePath("/dashboard");
}

/**
 * Recebimento da receita de serviço de um atendimento. A venda (transação
 * pendente) nasce na conclusão do atendimento; aqui o operador informa a
 * forma de pagamento e o dinheiro passa a contar como recebido.
 * Idempotente: repetir a confirmação não cria segunda receita (índice único
 * por atendimento + categoria service).
 */
export async function confirmPayment(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "finance:view")) return;

  const appointmentId = String(formData.get("appointmentId") ?? "");
  const method = paymentMethodSchema.safeParse(formData.get("paymentMethod"));
  if (!appointmentId || !method.success) return;

  const supabase = await createSupabaseServerClient();
  const { data: appointment } = await supabase
    .from("appointments")
    .select("id,service:services(name,price),client:clients(name)")
    .eq("id", appointmentId)
    .eq("barbershop_id", tenant.id)
    .single();
  if (!appointment) return;

  const service = first(appointment.service);
  const client = first(appointment.client);

  const { data: existing } = await supabase
    .from("financial_transactions")
    .select("id,status")
    .eq("barbershop_id", tenant.id)
    .eq("appointment_id", appointmentId)
    .eq("type", "income")
    .eq("category", "service")
    .maybeSingle();

  if (existing) {
    if (existing.status === "paid") return; // idempotente
    // Preserva o valor histórico da venda: mudanças de preço no catálogo
    // não alteram atendimentos já concluídos.
    await supabase
      .from("financial_transactions")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_method: method.data,
      })
      .eq("id", existing.id)
      .eq("barbershop_id", tenant.id);
  } else {
    // Recebimento antes da conclusão (pagou adiantado no balcão): cria a
    // receita já paga com o preço vigente. Quando o atendimento for
    // concluído, o trigger encontra esta transação e não duplica.
    const amount = Number(service?.price ?? 0);
    if (amount <= 0) return;
    await supabase.from("financial_transactions").insert({
      barbershop_id: tenant.id,
      type: "income",
      status: "paid",
      category: "service",
      description: `${service?.name ?? "Atendimento"} — ${client?.name ?? "Cliente"}`,
      amount,
      paid_at: new Date().toISOString(),
      payment_method: method.data,
      appointment_id: appointmentId,
      created_by: tenant.profileId,
    });
  }
  revalidate();
}

/**
 * Estorno do recebimento do serviço: a transação volta a "pendente" e o
 * histórico fica registrado em audit_logs (nada é apagado).
 */
export async function revertPayment(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "finance:view")) return;

  const appointmentId = String(formData.get("appointmentId") ?? "");
  if (!appointmentId) return;

  const supabase = await createSupabaseServerClient();
  const { data: transaction } = await supabase
    .from("financial_transactions")
    .select("id")
    .eq("barbershop_id", tenant.id)
    .eq("appointment_id", appointmentId)
    .eq("type", "income")
    .eq("category", "service")
    .maybeSingle();
  if (!transaction) return;

  await supabase.rpc("revert_income_payment", {
    p_transaction_id: transaction.id,
  });
  revalidate();
}

/** Recebimento de qualquer receita pendente (serviço, produto ou avulsa). */
export async function confirmTransactionPayment(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "finance:view")) return;

  const transactionId = z.uuid().safeParse(formData.get("transactionId"));
  const method = paymentMethodSchema.safeParse(formData.get("paymentMethod"));
  if (!transactionId.success || !method.success) return;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("financial_transactions")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_method: method.data,
    })
    .eq("id", transactionId.data)
    .eq("barbershop_id", tenant.id)
    .eq("type", "income")
    .in("status", ["pending", "overdue"]);
  revalidate();
}

/**
 * Cancela uma receita pendente lançada por engano. Transação paga precisa
 * ser estornada antes; o cancelamento fica auditado, nunca apagado.
 */
export async function cancelPendingTransaction(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "finance:view")) return;

  const transactionId = z.uuid().safeParse(formData.get("transactionId"));
  if (!transactionId.success) return;

  const supabase = await createSupabaseServerClient();
  await supabase.rpc("cancel_income_transaction", {
    p_transaction_id: transactionId.data,
    p_reason: String(formData.get("reason") ?? "") || null,
  });
  revalidate();
}
