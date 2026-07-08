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
  // A receita do serviço é independente das vendas de produto (confirmadas à
  // parte, com baixa no estoque).
  const amount = Number(service?.price ?? 0);
  if (amount <= 0) return;

  const description = `${service?.name ?? "Atendimento"} — ${client?.name ?? "Cliente"}`;

  const { data: existing } = await supabase
    .from("financial_transactions")
    .select("id")
    .eq("barbershop_id", tenant.id)
    .eq("appointment_id", appointmentId)
    .eq("type", "income")
    .eq("category", "service")
    .maybeSingle();

  if (existing) {
    await supabase
      .from("financial_transactions")
      .update({
        status: "paid",
        amount,
        paid_at: new Date().toISOString(),
        payment_method: method.data,
        description,
      })
      .eq("id", existing.id)
      .eq("barbershop_id", tenant.id);
  } else {
    await supabase.from("financial_transactions").insert({
      barbershop_id: tenant.id,
      type: "income",
      status: "paid",
      category: "service",
      description,
      amount,
      paid_at: new Date().toISOString(),
      payment_method: method.data,
      appointment_id: appointmentId,
      created_by: tenant.profileId,
    });
  }
  revalidate();
}

export async function revertPayment(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "finance:view")) return;

  const appointmentId = String(formData.get("appointmentId") ?? "");
  if (!appointmentId) return;

  const supabase = await createSupabaseServerClient();
  // Estorna apenas a receita do serviço; vendas de produto são independentes.
  await supabase
    .from("financial_transactions")
    .delete()
    .eq("barbershop_id", tenant.id)
    .eq("appointment_id", appointmentId)
    .eq("type", "income")
    .eq("category", "service");
  revalidate();
}
