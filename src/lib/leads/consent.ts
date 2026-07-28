/**
 * Texto de consentimento da captura de lead (Fase 0 §0.4 e §0.5).
 *
 * Duas correções moram aqui:
 *
 *  1. O texto era fixo em "NexoBarber" e aparecia igual na landing de salão,
 *     que se apresenta como NexoBeleza. A pessoa autorizava o contato de uma
 *     marca que não era a que ela estava lendo.
 *  2. Não havia versão. Sem saber QUAL texto foi aceito, o consentimento não
 *     prova nada — e a LGPD (art. 8º, §1º) põe o ônus da prova em quem trata
 *     o dado. A versão é gravada junto com IP e user-agent no registro.
 *
 * Ao mudar a redação, INCREMENTE a versão. Registros antigos continuam
 * apontando para o texto que a pessoa realmente leu.
 */

export type LeadVertical = "barber" | "salon";

export const CONSENT_TEXT_VERSION = "2026-07-28.v1";

const BRAND: Record<LeadVertical, string> = {
  barber: "NexoBarber",
  salon: "NexoBeleza",
};

export function brandName(vertical: LeadVertical): string {
  return BRAND[vertical] ?? BRAND.barber;
}

export function consentText(vertical: LeadVertical): string {
  return `Autorizo o contato do ${brandName(vertical)} sobre o produto por este canal. Sem spam — e você pode pedir para parar quando quiser.`;
}

/**
 * IP no formato que a coluna `saas_leads.consent_ip` (`inet`) aceita.
 *
 * Um valor que o Postgres recusaria vira null em vez de derrubar o cadastro:
 * sem prova de IP o consentimento ainda vale (data, user-agent e versão
 * continuam gravados); sem lead não vale nada.
 */
export function consentIp(value: string): string | null {
  if (!value || value === "unknown") return null;
  let clean = value.trim();
  // "[::1]:443" → "::1"; "1.2.3.4:5678" → "1.2.3.4". IPv6 sem colchetes não
  // tem como separar porta com segurança (os dois-pontos são do endereço),
  // então fica inteiro.
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(clean);
  if (bracketed) clean = bracketed[1]!;
  else if (clean.split(":").length === 2 && clean.includes("."))
    clean = clean.split(":")[0]!;
  clean = clean.split("%")[0]!; // zona do IPv6 link-local
  return /^[0-9a-fA-F.:]+$/.test(clean) ? clean : null;
}
