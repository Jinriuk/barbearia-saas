/**
 * Situação do plano do cliente, com os quatro estados do §7.4 e a cor que o
 * guia manda: Ativo verde, Vence em breve amarelo, Vencido vermelho, Pausado
 * cinza. Antes só existiam três, e "em dia" era pintado de dourado — a cor de
 * marca — o que fazia amarelo significar "tudo certo", o oposto do guia.
 *
 * Devolve o TOM do Badge, não uma classe: a Fase 1.9 acabou com os dois
 * sistemas de cor paralelos, e a situação do plano passa pelo mesmo caminho
 * da situação do atendimento.
 */
export type MembershipStatus =
  "active" | "due_soon" | "past_due" | "paused" | null;

type Tone = "success" | "warning" | "danger" | "neutral";

const META: Record<
  Exclude<MembershipStatus, null>,
  { label: string; tone: Tone }
> = {
  active: { label: "Plano em dia", tone: "success" },
  due_soon: { label: "Plano vence em breve", tone: "warning" },
  past_due: { label: "Plano vencido", tone: "danger" },
  paused: { label: "Plano pausado", tone: "neutral" },
};

export function membershipStatusMeta(status: MembershipStatus) {
  if (!status) return null;
  return META[status] ?? null;
}

/** Rótulo curto, para tabelas onde a palavra "plano" já está na coluna. */
export function membershipStatusLabel(status: MembershipStatus) {
  if (!status) return "Sem plano";
  return META[status]?.label.replace("Plano ", "") ?? status;
}
