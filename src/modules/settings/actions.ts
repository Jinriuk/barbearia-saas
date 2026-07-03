"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { isPlus } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types/domain";

const appearanceSchema = z.object({
  heroTitle: z.string().trim().min(3).max(120),
  heroSubtitle: z.string().trim().min(3).max(240),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

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
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tenant_settings")
    .update({
      hero_title: parsed.data.heroTitle,
      hero_subtitle: parsed.data.heroSubtitle,
      primary_color: parsed.data.primaryColor,
      secondary_color: parsed.data.secondaryColor,
      background_color: parsed.data.backgroundColor,
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
