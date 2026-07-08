"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { isPlus } from "@/lib/plans";
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
    .union([z.url(), z.string().regex(/^\/backgrounds\/[\w-]+\.svg$/), z.literal("")])
    .optional(),
});

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

async function uploadTenantAsset(
  file: File,
  tenantId: string,
  prefix: string,
): Promise<{ url: string } | { error: string }> {
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo de imagem." };
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { error: "Formato inválido. Use PNG, JPG ou WebP." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Imagem muito grande. O limite é 4 MB." };
  }
  const supabase = await createSupabaseServerClient();
  const path = `${tenantId}/${prefix}-${Date.now()}.${extensionFor(file.type)}`;
  const { error } = await supabase.storage
    .from("public-assets")
    .upload(path, file, { cacheControl: "3600", upsert: true });
  if (error) {
    return { error: "Não foi possível enviar a imagem. Tente novamente." };
  }
  const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
  return { url: data.publicUrl };
}

const contactSchema = z.object({
  whatsappNumber: z.string().trim().max(30).optional(),
  instagramUrl: z.union([z.url(), z.literal("")]).optional(),
  address: z.string().trim().max(240).optional(),
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
  });
  if (!parsed.success) {
    return { success: false, message: "Revise os dados de contato." };
  }
  const tenant = await requireTenant();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tenant_settings")
    .update({
      whatsapp_number: parsed.data.whatsappNumber || null,
      instagram_url: parsed.data.instagramUrl || null,
      address: parsed.data.address || null,
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
