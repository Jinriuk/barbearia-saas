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

const BRAND: Record<LeadVertical, string> = {
  barber: "NexoBarber",
  salon: "NexoBeleza",
};

export function brandName(vertical: LeadVertical): string {
  return BRAND[vertical] ?? BRAND.barber;
}

/**
 * Histórico das redações, por versão. NUNCA edite uma entrada existente: para
 * mudar o texto, acrescente uma versão nova e aponte CONSENT_TEXT_VERSION para
 * ela. A versão gravada em `saas_leads.consent_text_version` só prova alguma
 * coisa se o texto daquela versão continuar recuperável aqui — sem este mapa,
 * um registro de julho apontaria para uma redação que já não existe.
 */
const CONSENT_TEXTS: Record<string, (vertical: LeadVertical) => string> = {
  "2026-07-28.v1": (vertical) =>
    `Autorizo o contato do ${brandName(vertical)} sobre o produto por este canal. Sem spam — e você pode pedir para parar quando quiser.`,
};

export const CONSENT_TEXT_VERSION = "2026-07-28.v1";

export function consentText(vertical: LeadVertical): string {
  return CONSENT_TEXTS[CONSENT_TEXT_VERSION]!(vertical);
}

/** O texto exato de uma versão passada, para exibir numa contestação. */
export function consentTextForVersion(
  version: string,
  vertical: LeadVertical,
): string | null {
  const build = CONSENT_TEXTS[version];
  return build ? build(vertical) : null;
}

/** Versão desconhecida (bundle adulterado) não vira prova falsa. */
export function isKnownConsentVersion(version: string): boolean {
  return Object.hasOwn(CONSENT_TEXTS, version);
}

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
