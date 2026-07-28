"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types/domain";

const settingsSchema = z.object({
  professionalId: z.uuid(),
  model: z.enum(["commission", "fixed", "hybrid"]),
  baseSalary: z.coerce.number().min(0).max(9999999),
  paymentPeriod: z.enum(["weekly", "biweekly", "monthly"]),
  paymentDay: z.coerce.number().int().min(1).max(31).optional(),
  // Taxa padrão do profissional (Fase 4): usada quando o serviço não define
  // uma comissão específica (precedência do serviço quando > 0).
  commissionRate: z.coerce.number().min(0).max(100).optional(),
});

const paymentSchema = z.object({
  professionalId: z.uuid(),
  amount: z.coerce.number().min(0.01).max(9999999),
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});

const advanceSchema = z.object({
  professionalId: z.uuid(),
  amount: z.coerce.number().min(0.01).max(9999999),
  notes: z.string().trim().max(500).optional(),
  referenceDate: z.iso.date().optional(),
});

function revalidate() {
  revalidatePath("/comissoes");
  revalidatePath("/financeiro");
  revalidatePath("/contas-a-pagar");
  revalidatePath("/profissionais");
}

export async function saveEmployeePaySettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "finance:view")) {
    return {
      success: false,
      message: "Apenas o proprietário pode configurar.",
    };
  }
  const parsed = settingsSchema.safeParse({
    professionalId: formData.get("professionalId"),
    model: formData.get("model"),
    baseSalary: formData.get("baseSalary") || 0,
    paymentPeriod: formData.get("paymentPeriod"),
    paymentDay: formData.get("paymentDay") || undefined,
    commissionRate: formData.get("commissionRate") || undefined,
  });
  if (!parsed.success) {
    return { success: false, message: "Revise os dados do pagamento." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("employee_pay_settings").upsert(
    {
      barbershop_id: tenant.id,
      professional_id: parsed.data.professionalId,
      model: parsed.data.model,
      base_salary: parsed.data.baseSalary,
      payment_period: parsed.data.paymentPeriod,
      payment_day: parsed.data.paymentDay ?? null,
      commission_rate: parsed.data.commissionRate ?? 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "professional_id" },
  );
  if (error) {
    return { success: false, message: "Não foi possível salvar." };
  }
  revalidate();
  return { success: true, message: "Configuração salva." };
}

export async function registerEmployeePayment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "finance:view")) {
    return { success: false, message: "Apenas o proprietário pode registrar." };
  }
  // formData.get() devolve null para campo ausente, e z.string().optional()
  // aceita undefined mas rejeita null — sem o "?? undefined" a action
  // recusava pagamentos válidos quando o campo notes não existia no form.
  const parsed = paymentSchema.safeParse({
    professionalId: formData.get("professionalId"),
    amount: formData.get("amount"),
    reference: formData.get("reference") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) {
    return { success: false, message: "Informe um valor válido." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: professional } = await supabase
    .from("professionals")
    .select("name")
    .eq("id", parsed.data.professionalId)
    .eq("barbershop_id", tenant.id)
    .maybeSingle();
  if (!professional) {
    return { success: false, message: "Profissional não encontrado." };
  }

  const { error } = await supabase.from("employee_payments").insert({
    barbershop_id: tenant.id,
    professional_id: parsed.data.professionalId,
    amount: parsed.data.amount,
    reference: parsed.data.reference || null,
    notes: parsed.data.notes || null,
    created_by: tenant.profileId,
  });
  if (error) {
    return {
      success: false,
      message: "Não foi possível registrar o pagamento.",
    };
  }

  // Integra com o financeiro como despesa paga.
  await supabase.from("financial_transactions").insert({
    barbershop_id: tenant.id,
    type: "expense",
    status: "paid",
    category: "salary",
    description: `Pagamento — ${professional.name}${
      parsed.data.reference ? ` (${parsed.data.reference})` : ""
    }`,
    amount: parsed.data.amount,
    paid_at: new Date().toISOString(),
    created_by: tenant.profileId,
  });

  revalidate();
  return { success: true, message: "Pagamento registrado." };
}

/**
 * Adiantamento / vale (Fase 3 — item 3.4).
 *
 * Prática universal em barbearia: o barbeiro pede R$ 100 na terça e o dono
 * abate no fechamento. Sem isso no sistema, o dono continua fazendo a conta
 * no papel — e o "valor a pagar" da tela mente para mais.
 *
 * O dinheiro sai do caixa AGORA, então o vale entra como despesa paga na
 * hora. No fechamento ele é abatido do valor a pagar (`commission_summary`),
 * nunca somado duas vezes: o pagamento final registra apenas o saldo.
 */
export async function registerEmployeeAdvance(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "finance:view")) {
    return { success: false, message: "Apenas o proprietário pode registrar." };
  }
  const parsed = advanceSchema.safeParse({
    professionalId: formData.get("professionalId"),
    amount: formData.get("amount"),
    notes: formData.get("notes") ?? undefined,
    referenceDate: formData.get("referenceDate") || undefined,
  });
  if (!parsed.success) {
    return { success: false, message: "Informe um valor válido para o vale." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: professional } = await supabase
    .from("professionals")
    .select("name")
    .eq("id", parsed.data.professionalId)
    .eq("barbershop_id", tenant.id)
    .maybeSingle();
  if (!professional) {
    return { success: false, message: "Profissional não encontrado." };
  }

  const { data: transaction } = await supabase
    .from("financial_transactions")
    .insert({
      barbershop_id: tenant.id,
      type: "expense",
      status: "paid",
      category: "salary",
      description: `Vale — ${professional.name}`,
      amount: parsed.data.amount,
      paid_at: new Date().toISOString(),
      created_by: tenant.profileId,
    })
    .select("id")
    .single();

  const { error } = await supabase.from("employee_advances").insert({
    barbershop_id: tenant.id,
    professional_id: parsed.data.professionalId,
    amount: parsed.data.amount,
    notes: parsed.data.notes || null,
    reference_date:
      parsed.data.referenceDate ?? new Date().toISOString().slice(0, 10),
    transaction_id: transaction?.id ?? null,
    created_by: tenant.profileId,
  });
  if (error) {
    // A despesa já entrou no caixa; sem o vínculo o abatimento não
    // aconteceria e o profissional receberia duas vezes. Desfaz.
    if (transaction?.id) {
      await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", transaction.id)
        .eq("barbershop_id", tenant.id);
    }
    return { success: false, message: "Não foi possível registrar o vale." };
  }

  revalidate();
  return {
    success: true,
    message: "Vale registrado e já abatido do fechamento.",
  };
}
