"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serviceSchema } from "@/lib/validators/entities";

export async function saveService(formData: FormData) {
  const parsed = serviceSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    durationMinutes: formData.get("durationMinutes"),
  });
  if (!parsed.success) return;
  const tenant = await requireTenant();
  const supabase = await createSupabaseServerClient();
  const payload = {
    barbershop_id: tenant.id,
    name: parsed.data.name,
    description: parsed.data.description || null,
    price: parsed.data.price,
    duration_minutes: parsed.data.durationMinutes,
  };
  if (parsed.data.id) {
    await supabase
      .from("services")
      .update(payload)
      .eq("id", parsed.data.id)
      .eq("barbershop_id", tenant.id);
  } else {
    const { data: service } = await supabase
      .from("services")
      .insert(payload)
      .select("id")
      .single();

    if (service) {
      const { data: professionals } = await supabase
        .from("professionals")
        .select("id")
        .eq("barbershop_id", tenant.id)
        .eq("active", true);

      if (professionals?.length) {
        await supabase.from("professional_services").insert(
          professionals.map((professional) => ({
            barbershop_id: tenant.id,
            professional_id: professional.id,
            service_id: service.id,
          })),
        );
      }
    }
  }
  revalidatePath("/servicos");
}

export async function toggleService(formData: FormData) {
  const tenant = await requireTenant();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active")) === "true";
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("services")
    .update({ active: !active })
    .eq("id", id)
    .eq("barbershop_id", tenant.id);
  revalidatePath("/servicos");
}
