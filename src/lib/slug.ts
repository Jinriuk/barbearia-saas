/** Gera um slug a partir de um texto: minúsculas, sem acentos, com hífens. */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // não-alfanumérico vira hífen
    .replace(/^-+|-+$/g, "") // tira hífens das pontas
    .slice(0, 63);
}
