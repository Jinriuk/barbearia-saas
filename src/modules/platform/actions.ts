"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PLANS, type PlanKey } from "@/lib/billing";

/**
 * Ações do super-admin sobre assinaturas. Todas exigem sessão de admin da
 * plataforma e usam o service role (as escritas em subscriptions não têm
 * policy para usuários comuns de propósito). O trigger no banco espelha
 * cada mudança em barbershops.status — cancelar tira a página do ar.
 */

const idSchema = z.uuid();

function revalidate() {
  revalidatePath("/admin");
}

async function updateSubscription(
  barbershopId: FormDataEntryValue | null,
  patch: Record<string, unknown>,
) {
  await requirePlatformAdmin();
  const parsed = idSchema.safeParse(barbershopId);
  if (!parsed.success) return;
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("subscriptions")
    .update(patch)
    .eq("barbershop_id", parsed.data);
  revalidate();
}

export async function suspendSubscription(formData: FormData) {
  await updateSubscription(formData.get("barbershopId"), {
    status: "suspended",
  });
}

export async function reactivateSubscription(formData: FormData) {
  // Reativa com um novo período de 30 dias a partir de agora.
  await updateSubscription(formData.get("barbershopId"), {
    status: "active",
    current_period_end: new Date(
      Date.now() + 30 * 86_400_000,
    ).toISOString(),
    canceled_at: null,
  });
}

export async function cancelSubscription(formData: FormData) {
  await updateSubscription(formData.get("barbershopId"), {
    status: "canceled",
    canceled_at: new Date().toISOString(),
  });
}

export async function extendTrial(formData: FormData) {
  await requirePlatformAdmin();
  const parsed = idSchema.safeParse(formData.get("barbershopId"));
  if (!parsed.success) return;
  const supabase = createSupabaseAdminClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("trial_ends_at")
    .eq("barbershop_id", parsed.data)
    .maybeSingle();
  // +7 dias a partir do fim atual do teste (ou de agora, se já venceu).
  const base = Math.max(
    Date.now(),
    sub?.trial_ends_at ? Date.parse(sub.trial_ends_at) : 0,
  );
  await supabase
    .from("subscriptions")
    .update({
      status: "trialing",
      trial_ends_at: new Date(base + 7 * 86_400_000).toISOString(),
    })
    .eq("barbershop_id", parsed.data);
  revalidate();
}

export async function changePlan(formData: FormData) {
  const plan = String(formData.get("plan") ?? "");
  if (!(plan in PLANS)) return;
  await updateSubscription(formData.get("barbershopId"), {
    plan,
    price_cents: PLANS[plan as PlanKey].priceCents,
  });
}
