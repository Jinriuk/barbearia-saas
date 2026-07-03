"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { professionalSchema } from "@/lib/validators/entities";
import type { ActionState } from "@/types/domain";

export async function saveProfessional(formData: FormData) {
  const parsed = professionalSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    phone: formData.get("phone"),
    bio: formData.get("bio"),
  });
  if (!parsed.success) return;
  const tenant = await requireTenant();
  const supabase = await createSupabaseServerClient();
  const payload = {
    barbershop_id: tenant.id,
    name: parsed.data.name,
    phone: parsed.data.phone || null,
    bio: parsed.data.bio || null,
  };
  if (parsed.data.id) {
    await supabase
      .from("professionals")
      .update(payload)
      .eq("id", parsed.data.id)
      .eq("barbershop_id", tenant.id);
  } else {
    const { data: professional } = await supabase
      .from("professionals")
      .insert(payload)
      .select("id")
      .single();

    if (professional) {
      const { data: services } = await supabase
        .from("services")
        .select("id")
        .eq("barbershop_id", tenant.id)
        .eq("active", true);

      if (services?.length) {
        await supabase.from("professional_services").insert(
          services.map((service) => ({
            barbershop_id: tenant.id,
            professional_id: professional.id,
            service_id: service.id,
          })),
        );
      }

      await supabase.from("professional_availability").insert(
        [1, 2, 3, 4, 5, 6].map((weekday) => ({
          barbershop_id: tenant.id,
          professional_id: professional.id,
          weekday,
          starts_at: "09:00",
          ends_at: "18:00",
          slot_interval_minutes: 15,
        })),
      );
    }
  }
  revalidatePath("/profissionais");
}

export async function toggleProfessional(formData: FormData) {
  const tenant = await requireTenant();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("professionals")
    .update({ active: String(formData.get("active")) !== "true" })
    .eq("id", String(formData.get("id")))
    .eq("barbershop_id", tenant.id);
  revalidatePath("/profissionais");
}

export async function deleteProfessional(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "catalog:manage")) {
    return { success: false, message: "Sem permissão para excluir." };
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return { success: false, message: "Profissional inválido." };

  const supabase = await createSupabaseServerClient();
  const { data: future } = await supabase
    .from("appointments")
    .select("id")
    .eq("barbershop_id", tenant.id)
    .eq("professional_id", id)
    .in("status", ["pending", "confirmed"])
    .gte("starts_at", new Date().toISOString())
    .limit(1);
  if (future?.length) {
    return {
      success: false,
      message:
        "Há agendamentos futuros com este profissional. Desative-o em vez de excluir.",
    };
  }

  const { error } = await supabase
    .from("professionals")
    .delete()
    .eq("id", id)
    .eq("barbershop_id", tenant.id);
  if (error) {
    return {
      success: false,
      message:
        "Não é possível excluir: há histórico vinculado. Você pode desativar o profissional.",
    };
  }
  revalidatePath("/profissionais");
  return { success: true, message: "Profissional excluído." };
}
