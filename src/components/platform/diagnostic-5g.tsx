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
    weak: "Você ainda é o call center da própria barbearia. Cada horário custa uma conversa — e some quando você está com a máquina na mão.",
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

export function Diagnostic5G() {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState(false);

  const answered = Object.keys(answers).length;
  const yes = Object.values(answers).filter(Boolean).length;
  const weakest = QUESTIONS.find((_, index) => answers[index] === false);

  if (done) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[.03] p-7 sm:p-8">
        <p className="text-xs font-semibold tracking-[0.22em] text-amber-400 uppercase">
          Seu diagnóstico
        </p>
        <p className="mt-3 font-mono text-5xl font-semibold">
          {yes}
          <span className="text-stone-600">/5</span>
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight">
          {yes === 5
            ? "Sua operação está redonda."
            : weakest
              ? `O seu ponto mais frágil é o ${weakest.g} — ${weakest.title}.`
              : "Dá para apertar alguns pontos."}
        </h3>
        <p className="mt-3 text-[15px] leading-7 text-stone-400">
          {yes === 5
            ? "Cinco de cinco é raro. Se você chegou aqui com tudo no lugar, o sistema serve para tirar o trabalho manual de manter assim."
            : (weakest?.weak ??
              "Comece pelo que dói mais e resolva um G de cada vez.")}
        </p>

        <div className="mt-7 border-t border-white/10 pt-7">
          <p className="mb-4 text-sm text-stone-400">
            Quer que a gente mostre como resolver esse ponto na sua realidade?
            Deixe o contato — sem compromisso.
          </p>
          <LeadCaptureForm vertical="barber" />
        </div>

        <button
          type="button"
          onClick={() => {
            setAnswers({});
            setDone(false);
          }}
          className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm text-stone-500 transition-colors hover:text-stone-300"
        >
          <RotateCcw className="size-4" /> Refazer o diagnóstico
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[.03] p-7 sm:p-8">
      <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-amber-400 uppercase">
        <ClipboardCheck className="size-4" /> Diagnóstico em 5 perguntas
      </p>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight">
        Como está a sua barbearia nos 5 Gs?
      </h3>
      <p className="mt-2 text-sm text-stone-500">
        Responda de cabeça. Leva menos de um minuto e não precisa de cadastro.
      </p>

      <ol className="mt-7 space-y-5">
        {QUESTIONS.map((item, index) => (
          <li key={item.g}>
            <p className="text-[15px] leading-6 text-stone-300">
              <span className="mr-2 font-mono text-xs text-amber-400">
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
                        ? "bg-emerald-500 text-stone-950"
                        : "bg-amber-500 text-stone-950"
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
        className="btn-shine mt-8 inline-flex h-12 items-center justify-center rounded-full bg-amber-500 px-7 text-[15px] font-semibold text-stone-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {answered < QUESTIONS.length
          ? `Faltam ${QUESTIONS.length - answered}`
          : "Ver o meu resultado"}
      </button>
    </div>
  );
}
