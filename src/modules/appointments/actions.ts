"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const statusSchema = z.enum(["confirmed", "completed", "canceled", "no_show"]);

// Transições válidas a partir do status atual.
const allowedTransitions: Record<string, string[]> = {
  pending: ["confirmed", "canceled"],
  confirmed: ["completed", "canceled", "no_show"],
};

export async function updateAppointmentStatus(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "appointments:manage")) return;

  const id = String(formData.get("id") ?? "");
  const parsed = statusSchema.safeParse(formData.get("status"));
  if (!id || !parsed.success) return;

  const supabase = await createSupabaseServerClient();
  const { data: appointment } = await supabase
    .from("appointments")
    .select("id,status")
    .eq("id", id)
    .eq("barbershop_id", tenant.id)
    .maybeSingle();
  if (!appointment) return;

  const allowed = allowedTransitions[appointment.status] ?? [];
  if (!allowed.includes(parsed.data)) return;

  await supabase
    .from("appointments")
    .update({ status: parsed.data })
    .eq("id", id)
    .eq("barbershop_id", tenant.id);

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/financeiro");
}
