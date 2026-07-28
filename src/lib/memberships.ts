/**
 * Situação do plano do cliente, com os quatro estados do §7.4 e a cor que
 * o guia manda: Ativo verde, Vence em breve amarelo, Vencido vermelho,
 * Pausado cinza. Antes só existiam três, e "em dia" era pintado de dourado
 * (a cor de marca), o que fazia amarelo significar "tudo certo" — o oposto
 * do que o guia estabelece.
 */
export type MembershipStatus =
  "active" | "due_soon" | "past_due" | "paused" | null;

const META: Record<
  Exclude<MembershipStatus, null>,
  { label: string; className: string }
> = {
  active: {
    label: "Plano em dia",
    className: "border-success/50 text-success",
  },
  due_soon: {
    label: "Plano vence em breve",
    className: "border-warning/50 text-warning",
  },
  past_due: {
    label: "Plano vencido",
    className: "border-destructive/50 text-destructive",
  },
  paused: {
    label: "Plano pausado",
    className: "text-muted-foreground",
  },
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
