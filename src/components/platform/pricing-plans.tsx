"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import { formatPriceBRL } from "@/lib/billing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Period = "monthly" | "yearly";
export type PricingTone = "dark" | "light";

export type PlanCard = {
  key: "starter" | "plus";
  name: string;
  pitch: string;
  monthlyCents: number;
  yearlyCents: number;
  features: string[];
  highlighted?: boolean;
};

/**
 * Planos com alternador mensal/anual (Fase 5 §5.2, pedido do sócio).
 *
 * O preço anual existia no banco desde a Fase 2B e a landing nunca o mostrou —
 * o visitante não tinha como saber que existia, e a assinatura nem sabia
 * guardar periodicidade. Duas escolhas de apresentação:
 *
 *  - O anual entra selecionado. É o que o sócio quer vender e é o que sai mais
 *    barato; deixar o mensal por padrão seria esconder a oferta.
 *  - A economia aparece em reais no ano E no equivalente por mês. "Economiza
 *    R$ 219 no ano" e "sai por R$ 41,58/mês" são as duas contas que o dono faz
 *    de cabeça — porcentagem sozinha não convence ninguém no balcão.
 *
 * O componente serve as duas verticais: a landing de barbearia é escura, a de
 * salão é clara. Sem o `tone`, o bloco de planos do salão viraria texto claro
 * sobre fundo claro — o mesmo defeito que o §5.9 aponta no formulário.
 */
export function PricingPlans({
  plans,
  tone = "dark",
  vertical = "barber",
}: {
  plans: PlanCard[];
  tone?: PricingTone;
  vertical?: "barber" | "salon";
}) {
  const [period, setPeriod] = useState<Period>("yearly");
  const light = tone === "light";

  return (
    <>
      <div className="mt-8 flex justify-center">
        <div
          role="radiogroup"
          aria-label="Periodicidade dos planos"
          className={
            light
              ? "inline-flex rounded-full border border-[#33202b]/12 bg-white p-1 shadow-sm"
              : "inline-flex rounded-full border border-white/15 bg-white/[.04] p-1"
          }
        >
          <PeriodTab
            light={light}
            selected={period === "monthly"}
            onSelect={() => setPeriod("monthly")}
            label="Mensal"
          />
          <PeriodTab
            light={light}
            selected={period === "yearly"}
            onSelect={() => setPeriod("yearly")}
            label="Anual"
            hint="2 meses grátis"
          />
        </div>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {plans.map((plan) => {
          const yearlySavings = plan.monthlyCents * 12 - plan.yearlyCents;
          const monthEquivalent = Math.round(plan.yearlyCents / 12);
          const isYearly = period === "yearly";
          return (
            <div
              key={plan.key}
              className={cardClass(light, plan.highlighted ?? false)}
            >
              {plan.highlighted ? (
                <Badge
                  className={
                    light
                      ? "absolute -top-3 left-8 border-transparent bg-[#c2497c] text-white"
                      : "absolute -top-3 left-8 border-transparent bg-amber-500 text-stone-950"
                  }
                >
                  <Sparkles className="size-3" /> Mais completo
                </Badge>
              ) : null}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p
                className={
                  light
                    ? "mt-1 text-sm text-[#33202b]/50"
                    : "mt-1 text-sm text-stone-500"
                }
              >
                {plan.pitch}
              </p>

              <p className="mt-5 text-4xl font-semibold tracking-tight">
                {formatPriceBRL(
                  isYearly ? plan.yearlyCents : plan.monthlyCents,
                )}
                <span
                  className={
                    light
                      ? "ml-1.5 align-middle text-sm font-normal text-[#33202b]/45"
                      : "ml-1.5 align-middle text-sm font-normal text-stone-500"
                  }
                >
                  {isYearly ? "/ano" : "/mês"}
                </span>
              </p>
              {isYearly ? (
                <p
                  className={
                    light
                      ? "mt-1 text-xs font-medium text-emerald-700"
                      : "mt-1 text-xs font-medium text-emerald-400"
                  }
                >
                  Sai por {formatPriceBRL(monthEquivalent)}/mês — você economiza{" "}
                  {formatPriceBRL(yearlySavings)} no ano
                </p>
              ) : (
                <p
                  className={
                    light
                      ? "mt-1 text-xs font-medium text-[#33202b]/45"
                      : "mt-1 text-xs font-medium text-stone-500"
                  }
                >
                  No anual sai por {formatPriceBRL(monthEquivalent)}/mês
                </p>
              )}
              <p
                className={
                  light
                    ? "mt-1 text-xs font-medium text-[#c2497c]"
                    : "mt-1 text-xs font-medium text-amber-400"
                }
              >
                7 dias grátis para testar
              </p>

              <ul
                className={
                  light
                    ? "mt-7 space-y-3 text-sm text-[#33202b]/65"
                    : "mt-7 space-y-3 text-sm text-stone-400"
                }
              >
                {plan.features.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check
                      className={
                        light
                          ? "mt-0.5 size-4 shrink-0 text-[#c2497c]"
                          : "mt-0.5 size-4 shrink-0 text-amber-400"
                      }
                    />
                    {item}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                variant={plan.highlighted ? "default" : "outline"}
                className={buttonClass(light, plan.highlighted ?? false)}
              >
                <Link
                  href={`/cadastro?plano=${plan.key}&periodo=${period}${
                    vertical === "salon" ? "&vertical=salon" : ""
                  }`}
                >
                  Começar 7 dias grátis
                  {plan.highlighted ? <ArrowUpRight /> : null}
                </Link>
              </Button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function cardClass(light: boolean, highlighted: boolean) {
  if (highlighted) {
    return light
      ? "relative h-full rounded-[2rem] border border-[#c2497c]/35 bg-gradient-to-b from-[#c2497c]/[.07] to-white p-8 shadow-2xl shadow-[#c2497c]/10"
      : "relative h-full rounded-[2rem] border border-amber-500/40 bg-gradient-to-b from-amber-500/[.1] to-transparent p-8 shadow-2xl shadow-amber-500/10";
  }
  return light
    ? "relative h-full rounded-[2rem] border border-[#33202b]/[.08] bg-white p-8 shadow-sm"
    : "relative h-full rounded-[2rem] border border-white/10 bg-white/[.02] p-8";
}

function buttonClass(light: boolean, highlighted: boolean) {
  if (highlighted) {
    return light
      ? "btn-shine mt-8 w-full rounded-full bg-[#c2497c] text-white hover:bg-[#a93a69]"
      : "btn-shine mt-8 w-full rounded-full bg-amber-500 text-stone-950 hover:bg-amber-400";
  }
  return light
    ? "mt-8 w-full rounded-full border-[#33202b]/15 hover:bg-[#33202b]/[.04]"
    : "mt-8 w-full rounded-full border-white/15 bg-white/5 hover:bg-white/10";
}

function PeriodTab({
  light,
  selected,
  onSelect,
  label,
  hint,
}: {
  light: boolean;
  selected: boolean;
  onSelect: () => void;
  label: string;
  hint?: string;
}) {
  const base =
    "flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-medium transition-colors";
  const selectedClass = light
    ? "bg-[#c2497c] text-white"
    : "bg-amber-500 text-stone-950";
  const idleClass = light
    ? "text-[#33202b]/70 hover:text-[#33202b]"
    : "text-stone-300 hover:text-white";
  const hintClass = selected
    ? light
      ? "bg-white/20"
      : "bg-stone-950/15"
    : light
      ? "bg-emerald-600/12 text-emerald-800"
      : "bg-emerald-400/15 text-emerald-300";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`${base} ${selected ? selectedClass : idleClass}`}
    >
      {label}
      {hint ? (
        <span
          className={`rounded-full px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide uppercase ${hintClass}`}
        >
          {hint}
        </span>
      ) : null}
    </button>
  );
}
