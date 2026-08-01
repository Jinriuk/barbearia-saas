"use client";

import { useState } from "react";
import { ClipboardCheck, RotateCcw } from "lucide-react";
import { LeadCaptureForm } from "@/components/platform/lead-capture-form";

/**
 * Diagnóstico dos 5 Gs (Fase 5 §5.8, isca de lead).
 *
 * Cinco perguntas de sim ou não, uma por G, na linguagem do balcão. O
 * resultado nomeia o G mais fraco e o que fazer a respeito — e só DEPOIS
 * oferece a captura. É o oposto do formulário genérico que estava sozinho no
 * fim da página.
 */

type Question = {
  g: string;
  title: string;
  question: string;
  weak: string;
};

const QUESTIONS: Question[] = [
  {
    g: "G1",
    title: "Agenda",
    question:
      "Seus clientes conseguem marcar horário sozinhos, sem mandar mensagem para você?",
    weak: "Você ainda é o call center do próprio negócio. Cada horário custa uma conversa — e some justamente quando você está atendendo.",
  },
  {
    g: "G2",
    title: "Clientes",
    question:
      "Você sabe dizer, agora, quais clientes estão atrasados para voltar?",
    weak: "Este é o vazamento mais caro e o mais silencioso: o cliente não reclama, ele só para de aparecer. Sem lista, ninguém liga para ele.",
  },
  {
    g: "G3",
    title: "Lucro",
    question:
      "No fim do mês, você sabe quanto SOBROU — depois de despesas e comissões?",
    weak: "Faturamento você sabe. Lucro é outra conta, e é a que decide se dá para contratar, reformar ou tirar férias.",
  },
  {
    g: "G4",
    title: "Equipe",
    question:
      "Você fecha a comissão da equipe sem precisar de papel, planilha ou memória?",
    weak: "Fechamento no papel é onde nasce a desconfiança: o profissional não consegue conferir a própria produção, e a conversa vira briga.",
  },
  {
    g: "G5",
    title: "Produtos",
    question:
      "Você sabe o que tem de estoque e quanto os produtos deixaram de lucro?",
    weak: "Produto parado é dinheiro parado na prateleira — e produto que acabou sem aviso é venda que não aconteceu.",
  },
];

export function Diagnostic5G({
  tone = "dark",
  vertical = "barber",
}: {
  tone?: "dark" | "light";
  vertical?: "barber" | "salon";
}) {
  const light = tone === "light";
  const card = light
    ? "rounded-[2rem] border border-[#33202b]/[.08] bg-white p-7 shadow-sm sm:p-8"
    : "rounded-[2rem] border border-white/10 bg-white/[.03] p-7 sm:p-8";
  const eyebrow = light ? "text-[#c2497c]" : "text-amber-400";
  const body = light ? "text-[#33202b]/70" : "text-stone-400";
  const muted = light ? "text-[#33202b]/50" : "text-stone-500";
  const rule = light ? "border-[#33202b]/10" : "border-white/10";
  const primaryBtn = light
    ? "bg-[#c2497c] text-white hover:bg-[#a93a69]"
    : "bg-amber-500 text-stone-950 hover:bg-amber-400";
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState(false);

  const answered = Object.keys(answers).length;
  const yes = Object.values(answers).filter(Boolean).length;
  const weakest = QUESTIONS.find((_, index) => answers[index] === false);

  if (done) {
    return (
      <div className={card}>
        <p
          className={`text-xs font-semibold tracking-[0.22em] uppercase ${eyebrow}`}
        >
          Seu diagnóstico
        </p>
        <p className="mt-3 font-mono text-5xl font-semibold">
          {yes}
          <span className={muted}>/5</span>
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight">
          {yes === 5
            ? "Sua operação está redonda."
            : weakest
              ? `O seu ponto mais frágil é o ${weakest.g} — ${weakest.title}.`
              : "Dá para apertar alguns pontos."}
        </h3>
        <p className={`mt-3 text-[15px] leading-7 ${body}`}>
          {yes === 5
            ? "Cinco de cinco é raro. Se você chegou aqui com tudo no lugar, o sistema serve para tirar o trabalho manual de manter assim."
            : (weakest?.weak ??
              "Comece pelo que dói mais e resolva um G de cada vez.")}
        </p>

        <div className={`mt-7 border-t pt-7 ${rule}`}>
          <p className={`mb-4 text-sm ${body}`}>
            Quer que a gente mostre como resolver esse ponto na sua realidade?
            Deixe o contato — sem compromisso.
          </p>
          <LeadCaptureForm vertical={vertical} />
        </div>

        <button
          type="button"
          onClick={() => {
            setAnswers({});
            setDone(false);
          }}
          className={`mt-6 inline-flex min-h-11 items-center gap-2 text-sm transition-colors ${muted} hover:opacity-80`}
        >
          <RotateCcw className="size-4" /> Refazer o diagnóstico
        </button>
      </div>
    );
  }

  return (
    <div className={card}>
      <p
        className={`flex items-center gap-2 text-xs font-semibold tracking-[0.22em] uppercase ${eyebrow}`}
      >
        <ClipboardCheck className="size-4" /> Diagnóstico em 5 perguntas
      </p>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight">
        Como está o seu {vertical === "salon" ? "salão" : "negócio"} nos 5 Gs?
      </h3>
      <p className={`mt-2 text-sm ${muted}`}>
        Responda de cabeça. Leva menos de um minuto e não precisa de cadastro.
      </p>

      <ol className="mt-7 space-y-5">
        {QUESTIONS.map((item, index) => (
          <li key={item.g}>
            <p className={`text-[15px] leading-6 ${body}`}>
              <span className={`mr-2 font-mono text-xs ${eyebrow}`}>
                {item.g}
              </span>
              {item.question}
            </p>
            <div
              role="radiogroup"
              aria-label={item.question}
              className="mt-2.5 flex gap-2"
            >
              {[true, false].map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  role="radio"
                  aria-checked={answers[index] === value}
                  onClick={() =>
                    setAnswers((previous) => ({ ...previous, [index]: value }))
                  }
                  className={`min-h-11 rounded-full px-5 text-sm font-medium transition-colors ${
                    answers[index] === value
                      ? value
                        ? light
                          ? "bg-emerald-700 text-white"
                          : "bg-emerald-500 text-stone-950"
                        : light
                          ? "bg-[#c2497c] text-white"
                          : "bg-amber-500 text-stone-950"
                      : light
                        ? "border border-[#33202b]/15 bg-white text-[#33202b]/75 hover:bg-[#33202b]/[.04]"
                        : "border border-white/15 bg-white/[.04] text-stone-300 hover:bg-white/[.08]"
                  }`}
                >
                  {value ? "Sim" : "Ainda não"}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        disabled={answered < QUESTIONS.length}
        onClick={() => setDone(true)}
        className={`btn-shine mt-8 inline-flex h-12 items-center justify-center rounded-full px-7 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${primaryBtn}`}
      >
        {answered < QUESTIONS.length
          ? `Faltam ${QUESTIONS.length - answered}`
          : "Ver o meu resultado"}
      </button>
    </div>
  );
}
