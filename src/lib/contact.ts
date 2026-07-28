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

export function instagramHandle(url: string | null | undefined) {
  if (!url) return null;
  const match = url.match(/instagram\.com\/([\w.]+)/i);
  return match ? `@${match[1]}` : null;
}
