"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { MAX_PHOTO_BYTES, uploadPublicImage } from "@/lib/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types/domain";

const profileSchema = z.object({
  id: z.uuid(),
  bio: z.string().trim().max(200).optional(),
});

/**
 * Perfil público do profissional: bio curta e foto (avatar). É o que deixa a
 * página pública viva — o site já exibe avatarUrl/bio, faltava a tela gravar.
 */
export async function updateProfessionalProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "memberships:manage")) {
    return { success: false, message: "Apenas o proprietário pode alterar." };
  }

  const parsed = profileSchema.safeParse({
    id: formData.get("id"),
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Revise a apresentação (máximo de 200 caracteres).",
    };
  }

  const updates: { bio: string | null; avatar_url?: string } = {
    bio: parsed.data.bio || null,
  };

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    const result = await uploadPublicImage(
      avatar,
      `professionals/${tenant.id}/${parsed.data.id}`,
      MAX_PHOTO_BYTES,
    );
    if ("error" in result) return { success: false, message: result.error };
    updates.avatar_url = result.url;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("professionals")
    .update(updates)
    .eq("id", parsed.data.id)
    .eq("barbershop_id", tenant.id);
  if (error) {
    return {
      success: false,
      message: "Não foi possível salvar. Tente de novo.",
    };
  }

  revalidatePath("/profissionais");
  revalidatePath(`/${tenant.slug}`);
  revalidatePath(`/${tenant.slug}/agendar`);
  return {
    success: true,
    message: "Perfil atualizado. Já vale na sua página.",
  };
}

const detailsSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(),
  bio: z.string().trim().max(200).optional(),
});

/**
 * Dados da ficha do profissional (Fase 3 — item 3.9, aba "Dados").
 *
 * Antes o nome e o telefone só existiam no cadastro inicial: corrigir um
 * sobrenome errado exigia excluir e recriar a pessoa, perdendo o histórico.
 */
export async function saveProfessionalDetails(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "memberships:manage")) {
    return { success: false, message: "Apenas o proprietário pode alterar." };
  }
  const parsed = detailsSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    phone: formData.get("phone") ?? undefined,
    bio: formData.get("bio") ?? undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Revise o nome (mínimo 2 caracteres) e a apresentação.",
    };
  }

  const updates: {
    name: string;
    phone: string | null;
    bio: string | null;
    avatar_url?: string;
  } = {
    name: parsed.data.name,
    phone: parsed.data.phone || null,
    bio: parsed.data.bio || null,
  };

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    const result = await uploadPublicImage(
      avatar,
      `professionals/${tenant.id}/${parsed.data.id}`,
      MAX_PHOTO_BYTES,
    );
    if ("error" in result) return { success: false, message: result.error };
    updates.avatar_url = result.url;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("professionals")
    .update(updates)
    .eq("id", parsed.data.id)
    .eq("barbershop_id", tenant.id);
  if (error) {
    return { success: false, message: "Não foi possível salvar." };
  }

  revalidatePath("/profissionais");
  revalidatePath(`/profissionais/${parsed.data.id}`);
  revalidatePath(`/${tenant.slug}`);
  revalidatePath(`/${tenant.slug}/agendar`);
  return { success: true, message: "Ficha atualizada." };
}

/**
 * Serviços que o profissional executa (item 3.9, aba "Serviços e
 * comissões"). Substitui o conjunto inteiro: o formulário manda o estado
 * final, não um diff.
 */
export async function saveProfessionalServices(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "memberships:manage")) {
    return { success: false, message: "Apenas o proprietário pode alterar." };
  }
  const professionalId = String(formData.get("id") ?? "");
  const parsedId = z.uuid().safeParse(professionalId);
  if (!parsedId.success) {
    return { success: false, message: "Profissional inválido." };
  }
  const serviceIds = z
    .array(z.uuid())
    .max(200)
    .safeParse(formData.getAll("serviceIds").map(String));
  if (!serviceIds.success) {
    return { success: false, message: "Revise os serviços selecionados." };
  }

  const supabase = await createSupabaseServerClient();
  const { error: deleteError } = await supabase
    .from("professional_services")
    .delete()
    .eq("barbershop_id", tenant.id)
    .eq("professional_id", parsedId.data);
  if (deleteError) {
    return { success: false, message: "Não foi possível salvar." };
  }

  if (serviceIds.data.length) {
    const { error } = await supabase.from("professional_services").insert(
      serviceIds.data.map((serviceId) => ({
        barbershop_id: tenant.id,
        professional_id: parsedId.data,
        service_id: serviceId,
      })),
    );
    if (error) {
      return {
        success: false,
        message: "Não foi possível salvar os serviços. Tente de novo.",
      };
    }
  }

  revalidatePath(`/profissionais/${parsedId.data}`);
  revalidatePath(`/${tenant.slug}`);
  revalidatePath(`/${tenant.slug}/agendar`);
  return { success: true, message: "Serviços atualizados." };
}

/** Disponibilidade do profissional para novos agendamentos (etapa 3.3). */
export async function setProfessionalAvailability(formData: FormData) {
  const tenant = await requireTenant();
  const allowed =
    tenant.role === "owner" ||
    tenant.role === "manager" ||
    tenant.role === "receptionist";
  if (!allowed) return;
  const id = String(formData.get("id") ?? "");
  const available = String(formData.get("available")) === "true";
  if (!id) return;
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("professionals")
    .update({ public_visible: !available })
    .eq("id", id)
    .eq("barbershop_id", tenant.id);
  revalidatePath("/profissionais");
  revalidatePath("/agenda");
  // A vitrine pública muda junto (Fase 1: antes o profissional continuava
  // aparecendo na página até outra revalidação qualquer).
  revalidatePath(`/${tenant.slug}`);
  revalidatePath(`/${tenant.slug}/agendar`);
}

export async function toggleProfessional(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "catalog:manage")) return;
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
