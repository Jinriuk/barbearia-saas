import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { accessState } from "@/lib/billing";
import { normalizeVertical } from "@/lib/verticals";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  MembershipRole,
  SubscriptionInfo,
  SubscriptionStatus,
  TenantContext,
} from "@/types/domain";

export const getSessionUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const requireUser = cache(async () => {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
});

export const getTenantContext = cache(
  async (): Promise<TenantContext | null> => {
    const user = await getSessionUser();
    if (!user) return null;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("memberships")
      .select(
        "barbershop_id, role, profile:profiles!inner(id,name,auth_user_id,must_change_password), barbershop:barbershops!inner(id,name,slug,timezone,plan,vertical)",
      )
      .eq("status", "active")
      .eq("profiles.auth_user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    const profile = Array.isArray(data.profile)
      ? data.profile[0]
      : data.profile;
    const barbershop = Array.isArray(data.barbershop)
      ? data.barbershop[0]
      : data.barbershop;
    if (!profile || !barbershop) return null;

    // Assinatura da barbearia. Defensivo de propósito: erro ou linha ausente
    // (base legada, migration ainda não aplicada) vira null e não bloqueia.
    let subscription: SubscriptionInfo | null = null;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select(
        "status, plan, price_cents, trial_ends_at, current_period_end, cancel_at_period_end",
      )
      .eq("barbershop_id", barbershop.id)
      .maybeSingle();
    if (sub) {
      subscription = {
        status: sub.status as SubscriptionStatus,
        plan: sub.plan,
        priceCents: sub.price_cents,
        trialEndsAt: sub.trial_ends_at,
        currentPeriodEnd: sub.current_period_end,
        // Cancelamento pedido pelo dono, com efeito no fim do período pago
        // (Fase 0 §0.2). Defensivo: base sem a coluna vira false.
        cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      };
    }

    return {
      id: barbershop.id,
      name: barbershop.name,
      slug: barbershop.slug,
      timezone: barbershop.timezone,
      plan: barbershop.plan,
      vertical: normalizeVertical(barbershop.vertical),
      role: data.role as MembershipRole,
      profileId: profile.id,
      profileName: profile.name,
      // Senha definida por terceiro (dono criando acesso de colaborador —
      // §0.17). O layout do painel obriga a troca antes de qualquer uso.
      mustChangePassword: profile.must_change_password ?? false,
      subscription,
    };
  },
);

export const requireTenant = cache(async (opts?: { allowLocked?: boolean }) => {
  await requireUser();
  const tenant = await getTenantContext();
  if (!tenant) redirect("/onboarding");
  // Assinatura vencida além da tolerância bloqueia o painel inteiro,
  // exceto as telas de regularização (que passam allowLocked).
  if (!opts?.allowLocked) {
    const state = accessState(tenant.subscription);
    if (state === "locked" || state === "gone") redirect("/assinatura");
  }
  return tenant;
});
