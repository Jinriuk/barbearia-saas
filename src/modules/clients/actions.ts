"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientSchema } from "@/lib/validators/entities";

export async function saveClient(formData: FormData) {
  const parsed = clientSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return;
  const tenant = await requireTenant();
  const supabase = await createSupabaseServerClient();
  const payload = {
    barbershop_id: tenant.id,
    name: parsed.data.name,
    phone: parsed.data.phone,
    phone_normalized: parsed.data.phone.replace(/\D/g, ""),
    email: parsed.data.email || null,
    notes: parsed.data.notes || null,
  };
  if (parsed.data.id) {
    await supabase
      .from("clients")
      .update(payload)
      .eq("id", parsed.data.id)
      .eq("barbershop_id", tenant.id);
  } else {
    await supabase.from("clients").insert(payload);
  }
  revalidatePath("/clientes");
}

export async function toggleClient(formData: FormData) {
  const tenant = await requireTenant();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("clients")
    .update({ active: String(formData.get("active")) !== "true" })
    .eq("id", String(formData.get("id")))
    .eq("barbershop_id", tenant.id);
  revalidatePath("/clientes");
}
