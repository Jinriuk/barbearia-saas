"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serviceSchema } from "@/lib/validators/entities";
import type { ActionState } from "@/types/domain";

export async function saveService(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = serviceSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    durationMinutes: formData.get("durationMinutes"),
    category: formData.get("category") || undefined,
    imageUrl: formData.get("imageUrl") ?? "",
    active: formData.get("active") === "on",
    audience: formData.get("audience") || undefined,
    returnDays: formData.get("returnDays") || undefined,
    commissionRate: formData.get("commissionRate") || undefined,
    professionalIds: formData.getAll("professionalIds").map(String),
  });
  if (!parsed.success) {
    return { success: false, message: "Revise os campos do serviço." };
  }
  const tenant = await requireTenant();
  if (!can(tenant.role, "catalog:manage")) {
    return { success: false, message: "Sem permissão para salvar serviços." };
  }
  const supabase = await createSupabaseServerClient();
  const payload = {
    barbershop_id: tenant.id,
    name: parsed.data.name,
    description: parsed.data.description || null,
    price: parsed.data.price,
    duration_minutes: parsed.data.durationMinutes,
    category: parsed.data.category || null,
    image_url: parsed.data.imageUrl || null,
    active: parsed.data.active ?? true,
    audience: parsed.data.audience ?? "public",
    return_days: parsed.data.returnDays ?? null,
    commission_rate: parsed.data.commissionRate ?? 0,
  };

  let serviceId = parsed.data.id ?? null;
  if (serviceId) {
    const { error } = await supabase
      .from("services")
      .update(payload)
      .eq("id", serviceId)
      .eq("barbershop_id", tenant.id);
    if (error) {
      return { success: false, message: "Não foi possível salvar o serviço." };
    }
  } else {
    const { data: service } = await supabase
      .from("services")
      .insert(payload)
      .select("id")
      .single();
    serviceId = service?.id ?? null;
  }
  if (!serviceId) {
    return { success: false, message: "Não foi possível salvar o serviço." };
  }

  const professionalIds = parsed.data.professionalIds ?? [];
  if (formData.get("hasProfessionals") === "1") {
    // O form trouxe a seção de profissionais: sincroniza para exatamente a
    // seleção enviada (troca o conjunto atual, sem quebrar agendamentos antigos
    // — estes referenciam professional_id direto no appointment).
    await supabase
      .from("professional_services")
      .delete()
      .eq("barbershop_id", tenant.id)
      .eq("service_id", serviceId);
    if (professionalIds.length) {
      await supabase.from("professional_services").insert(
        professionalIds.map((professionalId) => ({
          barbershop_id: tenant.id,
          professional_id: professionalId,
          service_id: serviceId,
        })),
      );
    }
  } else if (!parsed.data.id) {
    // Criação sem a seção (fallback): vincula todos os profissionais ativos.
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
          service_id: serviceId,
        })),
      );
    }
  }
  revalidatePath("/servicos");
  revalidatePath("/profissionais");
  return { success: true, message: "Serviço salvo." };
}

export async function toggleService(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "catalog:manage")) return;
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

export async function deleteService(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "catalog:manage")) {
    return { success: false, message: "Sem permissão para excluir." };
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return { success: false, message: "Serviço inválido." };

  const supabase = await createSupabaseServerClient();
  const { data: future } = await supabase
    .from("appointments")
    .select("id")
    .eq("barbershop_id", tenant.id)
    .eq("service_id", id)
    .in("status", ["pending", "confirmed"])
    .gte("starts_at", new Date().toISOString())
    .limit(1);
  if (future?.length) {
    return {
      success: false,
      message:
        "Há agendamentos futuros com este serviço. Desative-o em vez de excluir.",
    };
  }

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("barbershop_id", tenant.id);
  if (error) {
    return {
      success: false,
      message:
        "Não é possível excluir: há histórico vinculado. Você pode desativar o serviço.",
    };
  }
  revalidatePath("/servicos");
  return { success: true, message: "Serviço excluído." };
}
