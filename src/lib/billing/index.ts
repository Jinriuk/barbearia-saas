import type { SubscriptionInfo } from "@/types/domain";

/**
 * Regras comerciais do SaaS (decididas pelo dono):
 * trial de 7 dias; venceu → aviso; +5 dias → painel bloqueia (página pública
 * continua no ar); +15 dias → cancela (página pública sai do ar).
 *
 * O estado efetivo é derivado pelo relógio a cada leitura (accessState), então
 * o bloqueio funciona mesmo sem o cron ter rodado; o cron diário apenas
 * persiste as transições (e aí a página pública cai no cancelamento).
 */
export const TRIAL_DAYS = 7;
export const LOCK_AFTER_DAYS = 5;
export const CANCEL_AFTER_DAYS = 15;

export const PLANS = {
  starter: {
    key: "starter",
    label: "Padrão",
    priceCents: 4990,
    description: "Tudo para operar a barbearia no dia a dia.",
    features: [
      "Agenda completa e agendamento online",
      "Cadastro de clientes e histórico",
      "Financeiro, contas e comissões",
      "Página pública da barbearia",
      "Equipe com papéis e permissões",
    ],
  },
  plus: {
    key: "plus",
    label: "Plus",
    priceCents: 9990,
    description: "Para faturar mais e ter a página com a sua cara.",
    features: [
      "Tudo do Padrão",
      "Produtos, estoque e venda no agendamento",
      "Página personalizada (cores, fotos e fundos)",
      "Temas prontos e identidade própria",
      "Relatórios em PDF",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function planConfig(plan: string | null | undefined) {
  return PLANS[(plan ?? "starter") as PlanKey] ?? PLANS.starter;
}

export type AccessState = "ok" | "warn" | "locked" | "gone";

const DAY_MS = 86_400_000;

/**
 * Deriva o acesso ao painel pelo relógio. Sem linha de assinatura (legado ou
 * tabela ainda não migrada), não bloqueia ninguém — fail-open de propósito.
 */
export function accessState(
  sub: SubscriptionInfo | null | undefined,
  now: number = Date.now(),
): AccessState {
  if (!sub) return "ok";
  if (sub.status === "canceled") return "gone";
  if (sub.status === "suspended") return "locked";

  const deadlineIso =
    sub.status === "trialing" ? sub.trialEndsAt : sub.currentPeriodEnd;
  const deadline = deadlineIso ? Date.parse(deadlineIso) : Number.NaN;
  if (Number.isNaN(deadline)) return "ok";

  const overdueMs = now - deadline;
  if (overdueMs <= 0) return sub.status === "past_due" ? "warn" : "ok";
  if (overdueMs > CANCEL_AFTER_DAYS * DAY_MS) return "gone";
  if (overdueMs > LOCK_AFTER_DAYS * DAY_MS) return "locked";
  return "warn";
}

/** Dias inteiros restantes até a data (0 se já passou). */
export function daysLeft(
  iso: string | null | undefined,
  now: number = Date.now(),
): number | null {
  if (!iso) return null;
  const target = Date.parse(iso);
  if (Number.isNaN(target)) return null;
  return Math.max(0, Math.ceil((target - now) / DAY_MS));
}

export function formatPriceBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
