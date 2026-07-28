"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { isPlus } from "@/lib/plans";
import { MAX_TENANT_ASSET_BYTES, uploadPublicImage } from "@/lib/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types/domain";

/**
 * Configurações do tenant.
 *
 * Desde a Fase 3 (item 3.10 / §7.8) existe UMA gravação só. As actions
 * anteriores — uma por cartão: aparência, contato, regras, horário, logo e
 * fundo — foram removidas junto com os cartões que as chamavam. Elas eram a
 * causa do problema descrito na auditoria: o dono mudava a cor e o contato,
 * salvava um cartão, e saía perdendo o outro sem receber aviso nenhum.
 */

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

/**
 * A validação é dividida em duas porque a aparência é exclusiva do Plus e os
 * campos chegam DESABILITADOS para quem está no Padrão — campo desabilitado
 * não entra no FormData. Exigir cor e título num schema único faria o
 * salvamento inteiro falhar para todo tenant Padrão.
 */
const baseSettingsSchema = z.object({
  businessName: z.string().trim().min(2).max(100),
  whatsappNumber: z.string().trim().max(30).optional(),
  instagramUrl: z.union([z.url(), z.literal("")]).optional(),
  address: z.string().trim().max(240).optional(),
  whatsappRemindersEnabled: z.coerce.boolean().optional(),
  bookingNoticeMinutes: z.coerce.number().int().min(0).max(10080),
  cancellationNoticeMinutes: z.coerce.number().int().min(0).max(10080),
  bookingHorizonDays: z.coerce.number().int().min(1).max(365),
  bookingConfirmationMode: z.enum(["manual", "auto"]),
  maxPendingPerClient: z.coerce.number().int().min(1).max(10),
});

const WEEKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

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

/**
 * Salva as seis seções de uma vez (item 3.10).
 *
 * Duas tabelas, uma ação: `barbershops` (nome do negócio e logo) e
 * `tenant_settings` (o resto). A personalização visual continua sendo do
 * plano Plus — quem está no Padrão salva os demais campos normalmente, e os
 * de aparência são ignorados em vez de bloquear a gravação inteira.
 *
 * As regras de agendamento gravadas aqui valem na hora: as RPCs públicas
 * leem `tenant_settings` direto do banco.
 */
export async function saveAllSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "settings:manage")) {
    return { success: false, message: "Apenas o proprietário pode alterar." };
  }

  const parsed = baseSettingsSchema.safeParse({
    businessName: formData.get("businessName"),
    whatsappNumber: formData.get("whatsappNumber") ?? undefined,
    instagramUrl: formData.get("instagramUrl") ?? undefined,
    address: formData.get("address") ?? undefined,
    whatsappRemindersEnabled: formData.get("whatsappRemindersEnabled") === "on",
    bookingNoticeMinutes: formData.get("bookingNoticeMinutes"),
    cancellationNoticeMinutes: formData.get("cancellationNoticeMinutes"),
    bookingHorizonDays: formData.get("bookingHorizonDays"),
    bookingConfirmationMode: formData.get("bookingConfirmationMode"),
    maxPendingPerClient: formData.get("maxPendingPerClient"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message:
        "Revise o nome do negócio e as regras de agendamento. Nada foi salvo — nenhuma seção fica pela metade.",
    };
  }

  const hours: Record<string, string> = {};
  for (const key of WEEKDAY_KEYS) {
    const value = String(formData.get(key) ?? "").trim();
    if (value.length > 40) {
      return {
        success: false,
        message: "Use textos curtos no horário (ex.: 09:00–19:00).",
      };
    }
    if (value) hours[key] = value;
  }

  const plus = isPlus(tenant.plan);

  // A aparência é validada e os arquivos são enviados ANTES de qualquer
  // gravação: assim um hex inválido ou um upload recusado não deixa metade
  // das configurações salva — que é exatamente o defeito que esta tela veio
  // corrigir.
  const settingsUpdates: Record<string, unknown> = {
    whatsapp_number: parsed.data.whatsappNumber || null,
    instagram_url: parsed.data.instagramUrl || null,
    address: parsed.data.address || null,
    whatsapp_reminders_enabled: parsed.data.whatsappRemindersEnabled ?? true,
    booking_notice_minutes: parsed.data.bookingNoticeMinutes,
    cancellation_notice_minutes: parsed.data.cancellationNoticeMinutes,
    booking_horizon_days: parsed.data.bookingHorizonDays,
    booking_confirmation_mode: parsed.data.bookingConfirmationMode,
    max_pending_per_client: parsed.data.maxPendingPerClient,
    opening_hours: hours,
  };
  const shopUpdates: { name: string; logo_url?: string } = {
    name: parsed.data.businessName,
  };

  if (plus) {
    const appearance = appearanceSchema.safeParse({
      heroTitle: formData.get("heroTitle"),
      heroSubtitle: formData.get("heroSubtitle"),
      primaryColor: formData.get("primaryColor"),
      secondaryColor: formData.get("secondaryColor"),
      backgroundColor: formData.get("backgroundColor"),
      backgroundType: formData.get("backgroundType") ?? "color",
      backgroundImageUrl: formData.get("backgroundImageUrl") ?? "",
    });
    if (!appearance.success) {
      return {
        success: false,
        message: "Revise as cores e os textos da página. Nada foi salvo.",
      };
    }

    const logo = formData.get("logo");
    if (logo instanceof File && logo.size > 0) {
      const result = await uploadTenantAsset(logo, tenant.id, "logo");
      if ("error" in result) return { success: false, message: result.error };
      shopUpdates.logo_url = result.url;
    }

    let backgroundImageUrl = appearance.data.backgroundImageUrl ?? "";
    const background = formData.get("backgroundFile");
    if (background instanceof File && background.size > 0) {
      const result = await uploadTenantAsset(background, tenant.id, "bg");
      if ("error" in result) return { success: false, message: result.error };
      backgroundImageUrl = result.url;
    }
    const useImage =
      appearance.data.backgroundType === "image" && !!backgroundImageUrl;

    settingsUpdates.hero_title = appearance.data.heroTitle;
    settingsUpdates.hero_subtitle = appearance.data.heroSubtitle;
    settingsUpdates.primary_color = appearance.data.primaryColor;
    settingsUpdates.secondary_color = appearance.data.secondaryColor;
    settingsUpdates.background_color = appearance.data.backgroundColor;
    settingsUpdates.background_type = useImage ? "image" : "color";
    settingsUpdates.background_image_url = useImage ? backgroundImageUrl : null;
  }

  const supabase = await createSupabaseServerClient();
  const { error: shopError } = await supabase
    .from("barbershops")
    .update(shopUpdates)
    .eq("id", tenant.id);
  if (shopError) {
    return {
      success: false,
      message: "Não foi possível salvar. Tente de novo.",
    };
  }

  const { error } = await supabase
    .from("tenant_settings")
    .update(settingsUpdates)
    .eq("barbershop_id", tenant.id);
  if (error) {
    return {
      success: false,
      message:
        "O nome do negócio foi salvo, mas o restante não. Tente de novo.",
    };
  }

  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");
  revalidatePath(`/${tenant.slug}`);
  revalidatePath(`/${tenant.slug}/agendar`);
  return {
    success: true,
    message: plus
      ? "Tudo salvo. As mudanças já valem na sua página de agendamento."
      : "Tudo salvo. A personalização visual é do plano Plus e não foi alterada.",
  };
}
