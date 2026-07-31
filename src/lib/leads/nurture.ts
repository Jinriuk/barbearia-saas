import { brandName, type LeadVertical } from "@/lib/leads/consent";

/**
 * Régua de recuperação de lead (Fase 5 §5.4).
 *
 * O pedido do sócio era "oferecer desconto por e-mail ou WhatsApp para quem
 * não converteu". Até aqui o lead entrava em `saas_leads` e morria lá:
 * `funnel_stage` nascia com `lead_submitted` e ninguém nunca o escrevia.
 *
 * A decisão de o que enviar mora aqui, separada de banco e de rede, porque é
 * a parte que erra em silêncio — mandar duas vezes, mandar para quem já é
 * cliente, mandar para quem pediu descadastro. O cron só executa.
 */

export const NURTURE_24H_MS = 24 * 60 * 60 * 1000;
export const NURTURE_72H_MS = 72 * 60 * 60 * 1000;

export type NurtureStep = "nurture_24h" | "nurture_72h" | "none";

export type NurtureLead = {
  channel: "whatsapp" | "email";
  createdAt: string;
  funnelStage: string;
  convertedAt: string | null;
  optOutAt: string | null;
  nurture24hAt: string | null;
  nurture72hAt: string | null;
};

/**
 * O que este lead deve receber agora — ou nada.
 *
 * Regras, em ordem de precedência:
 *  1. Quem converteu, pediu descadastro ou não deixou e-mail sai da régua.
 *     (WhatsApp fica de fora enquanto não houver opt-in de disparo ativo pela
 *     API oficial: o consentimento coletado é de contato, e disparo em massa
 *     no WhatsApp sem template aprovado derruba o número.)
 *  2. Nunca reenviar a mesma etapa: o carimbo de envio é a trava.
 *  3. As etapas são cumulativas no tempo, mas o lead que ficou 4 dias sem ser
 *     tocado (cron parado, provedor fora) recebe a de 24h primeiro — a oferta
 *     de 72h é a última carta e não pode ser a primeira coisa que ele lê.
 */
export function decideNurture(lead: NurtureLead, nowMs: number): NurtureStep {
  if (lead.convertedAt || lead.optOutAt) return "none";
  if (lead.funnelStage === "converted" || lead.funnelStage === "opted_out") {
    return "none";
  }
  if (lead.channel !== "email") return "none";

  const age = nowMs - Date.parse(lead.createdAt);
  if (Number.isNaN(age)) return "none";

  if (!lead.nurture24hAt) {
    return age >= NURTURE_24H_MS ? "nurture_24h" : "none";
  }
  if (!lead.nurture72hAt) {
    return age >= NURTURE_72H_MS ? "nurture_72h" : "none";
  }
  return "none";
}

export const NURTURE_STAGE: Record<
  Exclude<NurtureStep, "none">,
  { column: "nurture_24h_at" | "nurture_72h_at"; stage: string }
> = {
  nurture_24h: { column: "nurture_24h_at", stage: "nurture_24h_sent" },
  nurture_72h: { column: "nurture_72h_at", stage: "nurture_72h_sent" },
};

function layout({
  vertical,
  body,
  cta,
  ctaUrl,
  unsubscribeUrl,
}: {
  vertical: LeadVertical;
  body: string[];
  cta: string;
  ctaUrl: string;
  unsubscribeUrl: string;
}) {
  const brand = brandName(vertical);
  const paragraphs = body
    .map(
      (line) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#17202a">${line}</p>`,
    )
    .join("");

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f6f4f0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:32px">
    <tr><td>
      <p style="margin:0 0 24px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#8a5000;font-weight:700">${brand}</p>
      ${paragraphs}
      <p style="margin:28px 0 0">
        <a href="${ctaUrl}" style="display:inline-block;background:#17202a;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:600;font-size:15px">${cta}</a>
      </p>
      <p style="margin:32px 0 0;font-size:12px;line-height:1.6;color:#77828e">
        Você recebeu este e-mail porque pediu contato do ${brand}.
        <a href="${unsubscribeUrl}" style="color:#77828e">Não quero mais receber</a>.
      </p>
    </td></tr>
  </table>
</body></html>`;

  const text = `${brand}\n\n${body
    .map((line) => line.replace(/<[^>]+>/g, ""))
    .join(
      "\n\n",
    )}\n\n${cta}: ${ctaUrl}\n\nNão quero mais receber: ${unsubscribeUrl}`;

  return { html, text };
}

/** Primeiro toque: lembra a dor, não o produto. */
export function nurture24hEmail({
  name,
  vertical,
  appUrl,
  unsubscribeUrl,
}: {
  name: string;
  vertical: LeadVertical;
  appUrl: string;
  unsubscribeUrl: string;
}) {
  const firstName = name.trim().split(/\s+/)[0] ?? name;
  const { html, text } = layout({
    vertical,
    body: [
      `Oi, ${firstName}! Ontem você pediu para a gente falar sobre o ${brandName(vertical)}.`,
      "Antes de qualquer demonstração, uma pergunta que costuma doer: <strong>quantos clientes seus sumiram nos últimos 60 dias sem você perceber?</strong>",
      "A maioria dos donos não sabe responder — e não é desleixo, é que a informação está espalhada entre a agenda, o caderno e a cabeça. O sistema responde isso numa tela: quem está atrasado para voltar, há quantos dias, e quanto cada um gastava.",
      "Você pode ver funcionando agora mesmo, sem falar com ninguém e sem cartão.",
    ],
    cta: "Ver o sistema por dentro",
    ctaUrl: `${appUrl}/cadastro`,
    unsubscribeUrl,
  });
  return {
    subject: `${firstName}, quantos clientes sumiram sem você perceber?`,
    html,
    text,
  };
}

/** Última carta: a oferta, com prazo e cupom de verdade. */
export function nurture72hEmail({
  name,
  vertical,
  appUrl,
  unsubscribeUrl,
  couponCode,
  discountLabel,
}: {
  name: string;
  vertical: LeadVertical;
  appUrl: string;
  unsubscribeUrl: string;
  couponCode: string;
  discountLabel: string;
}) {
  const firstName = name.trim().split(/\s+/)[0] ?? name;
  const { html, text } = layout({
    vertical,
    body: [
      `Oi, ${firstName}. Não quero insistir — este é o último e-mail.`,
      `Se ficou a dúvida do preço, tenho uma carta na manga: o cupom <strong>${couponCode}</strong> tira ${discountLabel} do plano anual, que já sai mais barato que o mensal.`,
      // Sem prazo inventado: o cupom é um só, criado uma vez, e cada pessoa o
      // recebe num dia diferente — "vale por 30 dias" seria uma urgência que o
      // sistema não tem como cumprir por destinatário (mesmo princípio da
      // Fase 0: a página não promete o que o produto não faz).
      "O código já vem preenchido no link, e vale para o plano anual dos dois pacotes.",
      "Se não for a hora, tudo bem — pode responder este e-mail dizendo o que faltou. Eu leio.",
    ],
    cta: `Assinar com o cupom ${couponCode}`,
    // plano e periodicidade viajam junto: o cupom vale no anual, e a tela de
    // pagamento já abre nele com o código preenchido.
    ctaUrl: `${appUrl}/cadastro?plano=starter&periodo=yearly&cupom=${encodeURIComponent(couponCode)}`,
    unsubscribeUrl,
  });
  return {
    subject: `Último e-mail — ${discountLabel} no plano anual`,
    html,
    text,
  };
}
