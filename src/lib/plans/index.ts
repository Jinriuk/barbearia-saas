export type Plan = "starter" | "plus";

export const PLAN_LABEL: Record<string, string> = {
  starter: "Padrão",
  plus: "Plus",
};

/**
 * Plano Plus libera white label completo da área do cliente e o upsell de
 * produtos no checkout. O plano Padrão mantém um layout fixo e bem acabado.
 */
export function isPlus(plan: string | null | undefined): boolean {
  return plan === "plus";
}

export function planLabel(plan: string | null | undefined): string {
  return PLAN_LABEL[plan ?? ""] ?? "Padrão";
}
