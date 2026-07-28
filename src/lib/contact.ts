// Links de contato do site público.

/**
 * Normaliza um telefone livre para o formato internacional do WhatsApp
 * (dígitos com DDI; 10–11 dígitos ganham o 55 do Brasil). Devolve null
 * quando não dá para discar.
 */
export function whatsAppNumber(number: string | null | undefined) {
  if (!number) return null;
  const digits = number.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}

/** Monta o link wa.me a partir do número salvo (aceita formatos livres). */
export function whatsAppHref(number: string | null | undefined) {
  const normalized = whatsAppNumber(number);
  return normalized ? `https://wa.me/${normalized}` : null;
}

/**
 * Máscara progressiva de telefone brasileiro, aplicada enquanto se digita
 * (Fase 4): "11987654321" → "(11) 98765-4321". Aceita colar com formatação
 * e nunca bloqueia a digitação — só apresenta. Acima de 11 dígitos devolve
 * o número cru (estrangeiro), porque inventar parênteses ali confunde.
 */
export function formatPhoneBR(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length > 11) return digits;
  if (digits.length <= 2) return digits;
  const area = `(${digits.slice(0, 2)}) `;
  const rest = digits.slice(2);
  if (rest.length <= 4) return area + rest;
  const split = rest.length > 8 ? 5 : 4;
  return `${area}${rest.slice(0, split)}-${rest.slice(split)}`;
}

export function instagramHandle(url: string | null | undefined) {
  if (!url) return null;
  const match = url.match(/instagram\.com\/([\w.]+)/i);
  return match ? `@${match[1]}` : null;
}
