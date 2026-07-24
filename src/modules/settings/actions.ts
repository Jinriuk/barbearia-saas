"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { isPlus } from "@/lib/plans";
import { MAX_TENANT_ASSET_BYTES, uploadPublicImage } from "@/lib/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types/domain";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const appearanceSchema = z.object({
  heroTitle: z.string().trim().min(3).max(120),
  heroSubtitle: z.string().trim().min(3).max(240),
  primaryColor: hex,
  secondaryColor: hex,
  backgroundColor: hex,
  backgroundType: z.enum(["color", "image"]).default("color"),
  // URL de imagem padrão (/backgrounds/*.svg) ou de upload (supabase storage).
  backgroundImageUrl: z
    .union([
      z.url(),
      z.string().regex(/^\/backgrounds\/[\w-]+\.svg$/),
      z.literal(""),
    ])
    .optional(),
});

async function uploadTenantAsset(
  file: File,
  tenantId: string,
  prefix: string,
): Promise<{ url: string } | { error: string }> {
  return uploadPublicImage(
    file,
    `${tenantId}/${prefix}`,
    MAX_TENANT_ASSET_BYTES,
  );
}

const contactSchema = z.object({
  whatsappNumber: z.string().trim().max(30).optional(),
  instagramUrl: z.union([z.url(), z.literal("")]).optional(),
  address: z.string().trim().max(240).optional(),
  whatsappRemindersEnabled: z.coerce.boolean().optional(),
});

export async function saveAppearanceSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = appearanceSchema.safeParse({
    heroTitle: formData.get("heroTitle"),
    heroSubtitle: formData.get("heroSubtitle"),
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    backgroundColor: formData.get("backgroundColor"),
    backgroundType: formData.get("backgroundType") ?? "color",
    backgroundImageUrl: formData.get("backgroundImageUrl") ?? "",
  });
  if (!parsed.success) {
    return { success: false, message: "Revise as cores e os textos." };
  }
  const tenant = await requireTenant();
  if (!can(tenant.role, "settings:manage")) {
    return { success: false, message: "Apenas o proprietário pode alterar." };
  }
  if (!isPlus(tenant.plan)) {
    return {
      success: false,
      message: "A personalização visual é exclusiva do plano Plus.",
    };
  }
  const useImage =
    parsed.data.backgroundType === "image" && !!parsed.data.backgroundImageUrl;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tenant_settings")
    .update({
      hero_title: parsed.data.heroTitle,
      hero_subtitle: parsed.data.heroSubtitle,
      primary_color: parsed.data.primaryColor,
      secondary_color: parsed.data.secondaryColor,
      background_color: parsed.data.backgroundColor,
      background_type: useImage ? "image" : "color",
      background_image_url: useImage ? parsed.data.backgroundImageUrl : null,
    })
    .eq("barbershop_id", tenant.id);
  if (error) {
    return {
      success: false,
      message: "Não foi possível salvar. Tente de novo.",
    };
  }
  revalidatePath("/configuracoes");
  revalidatePath(`/${tenant.slug}`);
  revalidatePath(`/${tenant.slug}/agendar`);
  return {
    success: true,
    message: "Identidade atualizada. Já vale na sua página pública.",
  };
}

export async function saveContactSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = contactSchema.safeParse({
    whatsappNumber: formData.get("whatsappNumber"),
    instagramUrl: formData.get("instagramUrl"),
    address: formData.get("address"),
    whatsappRemindersEnabled: formData.get("whatsappRemindersEnabled") === "on",
  });
  if (!parsed.success) {
    return { success: false, message: "Revise os dados de contato." };
  }
  const tenant = await requireTenant();
  if (!can(tenant.role, "settings:manage")) {
    return { success: false, message: "Apenas o proprietário pode alterar." };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tenant_settings")
    .update({
      whatsapp_number: parsed.data.whatsappNumber || null,
      instagram_url: parsed.data.instagramUrl || null,
      address: parsed.data.address || null,
      whatsapp_reminders_enabled: parsed.data.whatsappRemindersEnabled ?? true,
    })
    .eq("barbershop_id", tenant.id);
  if (error) {
    return {
      success: false,
      message: "Não foi possível salvar. Tente de novo.",
    };
  }
  revalidatePath("/configuracoes");
  revalidatePath(`/${tenant.slug}`);
  return { success: true, message: "Contato atualizado." };
}

/** Upload da logo da barbearia (substitui a do cabeçalho da página pública). */
export async function uploadLogo(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "settings:manage")) {
    return { success: false, message: "Apenas o proprietário pode alterar." };
  }
  if (!isPlus(tenant.plan)) {
    return { success: false, message: "Disponível no plano Plus." };
  }
  const result = await uploadTenantAsset(
    formData.get("file") as File,
    tenant.id,
    "logo",
  );
  if ("error" in result) return { success: false, message: result.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("barbershops")
    .update({ logo_url: result.url })
    .eq("id", tenant.id);
  if (error) {
    return { success: false, message: "Enviada, mas não foi possível salvar." };
  }
  revalidatePath("/configuracoes");
  revalidatePath(`/${tenant.slug}`);
  revalidatePath(`/${tenant.slug}/agendar`);
  return { success: true, message: "Logo atualizada." };
}

/** Upload da imagem de fundo da página pública (aplica imediatamente). */
export async function uploadBackgroundImage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "settings:manage")) {
    return { success: false, message: "Apenas o proprietário pode alterar." };
  }
  if (!isPlus(tenant.plan)) {
    return { success: false, message: "Disponível no plano Plus." };
  }
  const result = await uploadTenantAsset(
    formData.get("file") as File,
    tenant.id,
    "bg",
  );
  if ("error" in result) return { success: false, message: result.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tenant_settings")
    .update({ background_type: "image", background_image_url: result.url })
    .eq("barbershop_id", tenant.id);
  if (error) {
    return { success: false, message: "Enviada, mas não foi possível salvar." };
  }
  revalidatePath("/configuracoes");
  revalidatePath(`/${tenant.slug}`);
  revalidatePath(`/${tenant.slug}/agendar`);
  return { success: true, message: "Fundo atualizado." };
}

const bookingRulesSchema = z.object({
  bookingNoticeMinutes: z.coerce.number().int().min(0).max(10080),
  cancellationNoticeMinutes: z.coerce.number().int().min(0).max(10080),
  bookingHorizonDays: z.coerce.number().int().min(1).max(365),
  bookingConfirmationMode: z.enum(["manual", "auto"]),
  maxPendingPerClient: z.coerce.number().int().min(1).max(10),
});

/**
 * Regras de agendamento (Fase 1 — §6.4): antecedência mínima, horizonte
 * máximo, modo de confirmação e limite de reservas em aberto por cliente.
 * As RPCs públicas leem estes campos direto do banco — salvar aqui muda o
 * comportamento da página de agendamento na hora. Idempotente: salvar os
 * mesmos valores não tem efeito colateral.
 */
export async function saveBookingRules(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = bookingRulesSchema.safeParse({
    bookingNoticeMinutes: formData.get("bookingNoticeMinutes"),
    cancellationNoticeMinutes: formData.get("cancellationNoticeMinutes"),
    bookingHorizonDays: formData.get("bookingHorizonDays"),
    bookingConfirmationMode: formData.get("bookingConfirmationMode"),
    maxPendingPerClient: formData.get("maxPendingPerClient"),
  });
  if (!parsed.success) {
    return { success: false, message: "Revise as regras de agendamento." };
  }
  const tenant = await requireTenant();
  if (!can(tenant.role, "settings:manage")) {
    return { success: false, message: "Apenas o proprietário pode alterar." };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tenant_settings")
    .update({
      booking_notice_minutes: parsed.data.bookingNoticeMinutes,
      cancellation_notice_minutes: parsed.data.cancellationNoticeMinutes,
      booking_horizon_days: parsed.data.bookingHorizonDays,
      booking_confirmation_mode: parsed.data.bookingConfirmationMode,
      max_pending_per_client: parsed.data.maxPendingPerClient,
    })
    .eq("barbershop_id", tenant.id);
  if (error) {
    return {
      success: false,
      message: "Não foi possível salvar. Tente de novo.",
    };
  }
  revalidatePath("/configuracoes");
  revalidatePath(`/${tenant.slug}`);
  revalidatePath(`/${tenant.slug}/agendar`);
  return { success: true, message: "Regras de agendamento atualizadas." };
}

const WEEKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

/**
 * Horário de funcionamento exibido na página pública (texto informativo por
 * dia; a disponibilidade real vem do expediente dos profissionais).
 */
export async function saveOpeningHours(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "settings:manage")) {
    return { success: false, message: "Apenas o proprietário pode alterar." };
  }
  const hours: Record<string, string> = {};
  for (const key of WEEKDAY_KEYS) {
    const value = String(formData.get(key) ?? "").trim();
    if (value.length > 40) {
      return {
        success: false,
        message: "Use textos curtos (ex.: 09:00–19:00).",
      };
    }
    if (value) hours[key] = value;
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tenant_settings")
    .update({ opening_hours: hours })
    .eq("barbershop_id", tenant.id);
  if (error) {
    return {
      success: false,
      message: "Não foi possível salvar. Tente de novo.",
    };
  }
  revalidatePath("/configuracoes");
  revalidatePath(`/${tenant.slug}`);
  return { success: true, message: "Horário de funcionamento atualizado." };
}
