/**
 * Verticais do SaaS: o motor é um só; a vertical é a "roupa" — marca, textos
 * e tema. Ela nasce no anúncio (cada landing tem sua URL para o tráfego
 * pago), viaja pelo cadastro e fica gravada na barbearia/salão para, mais à
 * frente, adaptar também a página do cliente final.
 */
export const VERTICALS = {
  barber: {
    key: "barber",
    brand: "NexoBarber",
    label: "Barbearia",
    landingPath: "/",
  },
  salon: {
    key: "salon",
    brand: "NexoBeleza",
    label: "Salão de beleza",
    landingPath: "/salao",
  },
} as const;

export type VerticalKey = keyof typeof VERTICALS;

export function normalizeVertical(value: unknown): VerticalKey {
  return value === "salon" ? "salon" : "barber";
}
