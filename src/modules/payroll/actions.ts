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
});

const paymentSchema = z.object({
  professionalId: z.uuid(),
  amount: z.coerce.number().min(0.01).max(9999999),
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});

function revalidate() {
  revalidatePath("/comissoes");
  revalidatePath("/financeiro");
  revalidatePath("/contas-a-pagar");
}

export async function saveEmployeePaySettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "finance:view")) {
    return { success: false, message: "Apenas o proprietário pode configurar." };
  }
  const parsed = settingsSchema.safeParse({
    professionalId: formData.get("professionalId"),
    model: formData.get("model"),
    baseSalary: formData.get("baseSalary") || 0,
    paymentPeriod: formData.get("paymentPeriod"),
    paymentDay: formData.get("paymentDay") || undefined,
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
  const parsed = paymentSchema.safeParse({
    professionalId: formData.get("professionalId"),
    amount: formData.get("amount"),
    reference: formData.get("reference"),
    notes: formData.get("notes"),
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
    return { success: false, message: "Não foi possível registrar o pagamento." };
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
