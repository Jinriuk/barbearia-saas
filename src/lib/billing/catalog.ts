import "server-only";

import { createClient } from "@supabase/supabase-js";
import { PLANS, type PlanKey } from "@/lib/billing";
import { getPublicSupabaseEnv } from "@/lib/env";

export type PlanCatalog = Record<
  PlanKey,
  { monthlyCents: number; yearlyCents: number }
>;

/** Fallback (mesma hipótese comercial): anual = 10 mensalidades. */
function fallbackCatalog(): PlanCatalog {
  return {
    starter: {
      monthlyCents: PLANS.starter.priceCents,
      yearlyCents: PLANS.starter.priceCents * 10,
    },
    plus: {
      monthlyCents: PLANS.plus.priceCents,
      yearlyCents: PLANS.plus.priceCents * 10,
    },
  };
}

/**
 * Catálogo de preços vigente (Fase 2B): a fonte de verdade é a tabela
 * plan_prices no banco (versionada por vigência). As constantes do frontend
 * viram fallback de indisponibilidade — landing, onboarding e assinatura
 * exibem o MESMO preço que a cobrança usará.
 *
 * Usa um client anônimo sem cookies de propósito: a landing continua
 * estática (ISR) e o preço atualiza na revalidação, sem tornar a página
 * dinâmica por sessão.
 */
export async function loadPlanCatalog(): Promise<PlanCatalog> {
  try {
    const { url, anonKey } = getPublicSupabaseEnv();
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.rpc("get_plan_catalog");
    if (error || !data?.length) return fallbackCatalog();
    const catalog = fallbackCatalog();
    for (const row of data as Array<{
      plan: string;
      period: string;
      price_cents: number;
    }>) {
      if (row.plan !== "starter" && row.plan !== "plus") continue;
      if (row.period === "monthly") {
        catalog[row.plan].monthlyCents = row.price_cents;
      } else if (row.period === "yearly") {
        catalog[row.plan].yearlyCents = row.price_cents;
      }
    }
    return catalog;
  } catch {
    return fallbackCatalog();
  }
}
