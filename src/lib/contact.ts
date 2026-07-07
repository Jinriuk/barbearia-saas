// Links de contato do site público.

/** Monta o link wa.me a partir do número salvo (aceita formatos livres). */
export function whatsAppHref(number: string | null | undefined) {
  if (!number) return null;
  const digits = number.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const withCountry =
    digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}

export function instagramHandle(url: string | null | undefined) {
  if (!url) return null;
  const match = url.match(/instagram\.com\/([\w.]+)/i);
  return match ? `@${match[1]}` : null;
}
