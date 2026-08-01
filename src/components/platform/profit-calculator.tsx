"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator } from "lucide-react";
import { formatPriceBRL } from "@/lib/billing";

/**
 * Calculadora de retorno (Fase 5 §5.8, isca de lead).
 *
 * A única oferta da página era "prefere que a gente fale com você?", que exige
 * do visitante a vontade de ser abordado. Esta calculadora entrega valor antes
 * de pedir qualquer coisa.
 *
 * A conta é deliberadamente conservadora e o texto diz de onde vem cada
 * número. Uma calculadora de marketing que promete o dobro do plausível
 * queima a confiança que a landing inteira está tentando construir — e a
 * Fase 0 acabou de tirar promessa não cumprida desta mesma página.
 */
export function ProfitCalculator({
  planCents,
  tone = "dark",
}: {
  planCents: number;
  tone?: "dark" | "light";
}) {
  const light = tone === "light";
  const [clients, setClients] = useState(180);
  const [ticket, setTicket] = useState(60);

  // Premissa única e declarada: recuperar 5% da base que sumiu, uma visita por
  // mês. Não é projeção de crescimento — é o cliente que já foi seu voltando.
  const recovered = Math.round(clients * 0.05);
  const monthlyGain = recovered * ticket;
  const gainCents = monthlyGain * 100;
  const payback = gainCents > 0 ? planCents / gainCents : 0;

  return (
    <div
      className={
        light
          ? "rounded-[2rem] border border-[#33202b]/[.08] bg-white p-7 shadow-sm sm:p-8"
          : "rounded-[2rem] border border-white/10 bg-white/[.03] p-7 sm:p-8"
      }
    >
      <p
        className={`flex items-center gap-2 text-xs font-semibold tracking-[0.22em] uppercase ${light ? "text-[#c2497c]" : "text-amber-400"}`}
      >
        <Calculator className="size-4" /> Faça a conta
      </p>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight">
        Quanto vale trazer de volta quem sumiu?
      </h3>

      <div className="mt-7 grid gap-6 sm:grid-cols-2">
        <Field
          light={light}
          id="calc-clients"
          label="Clientes na sua base"
          value={clients}
          min={20}
          max={1200}
          step={10}
          onChange={setClients}
          render={(value) => `${value} clientes`}
        />
        <Field
          light={light}
          id="calc-ticket"
          label="Gasto médio por visita"
          value={ticket}
          min={20}
          max={300}
          step={5}
          onChange={setTicket}
          render={(value) => formatPriceBRL(value * 100)}
        />
      </div>

      <div
        className={
          light
            ? "mt-7 rounded-2xl border border-emerald-700/20 bg-emerald-700/[.06] p-6"
            : "mt-7 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.07] p-6"
        }
      >
        <p
          className={`text-sm ${light ? "text-[#33202b]/65" : "text-stone-400"}`}
        >
          Recuperando{" "}
          <strong className={light ? "text-[#33202b]" : "text-stone-200"}>
            5%
          </strong>{" "}
          da base que parou de aparecer — {recovered}{" "}
          {recovered === 1 ? "cliente" : "clientes"} por mês:
        </p>
        <p
          className={`mt-2 font-mono text-4xl font-semibold ${light ? "text-emerald-700" : "text-emerald-400"}`}
        >
          +{formatPriceBRL(gainCents)}
          <span
            className={`ml-2 align-middle font-sans text-sm font-normal ${light ? "text-[#33202b]/50" : "text-stone-500"}`}
          >
            por mês
          </span>
        </p>
        <p
          className={`mt-3 text-sm leading-6 ${light ? "text-[#33202b]/65" : "text-stone-400"}`}
        >
          {payback <= 1
            ? `Mais que o plano inteiro, que custa ${formatPriceBRL(planCents)} por mês.`
            : `O plano custa ${formatPriceBRL(planCents)} por mês.`}{" "}
          A conta usa uma premissa só: cliente que já foi seu voltando uma vez.
          Nada de projeção de clientes novos.
        </p>
      </div>

      <Link
        href={light ? "/cadastro?vertical=salon" : "/cadastro"}
        className={
          light
            ? "btn-shine mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#c2497c] px-7 text-[15px] font-semibold text-white transition-colors hover:bg-[#a93a69]"
            : "btn-shine mt-6 inline-flex h-12 items-center justify-center rounded-full bg-amber-500 px-7 text-[15px] font-semibold text-stone-950 transition-colors hover:bg-amber-400"
        }
      >
        Ver quem sumiu da minha base
      </Link>
    </div>
  );
}

function Field({
  light,
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  render,
}: {
  light: boolean;
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  render: (value: number) => string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className={`flex items-baseline justify-between text-sm ${light ? "text-[#33202b]/65" : "text-stone-400"}`}
      >
        {label}
        <output
          htmlFor={id}
          className={`font-mono text-base ${light ? "text-[#33202b]" : "text-stone-100"}`}
        >
          {render(value)}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={`mt-3 h-2 w-full cursor-pointer appearance-none rounded-full ${light ? "bg-[#33202b]/10 accent-[#c2497c]" : "bg-white/10 accent-amber-500"}`}
      />
    </div>
  );
}
