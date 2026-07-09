import {
  REAL_PHOTOS,
  SALON_PHOTOS,
  SALON_STOCK,
  STOCK_PHOTOS,
} from "@/lib/assets";

/**
 * Verticais do SaaS: o motor é um só; a vertical é a "roupa" — marca, textos
 * e tema. Ela nasce no anúncio (cada landing tem sua URL para o tráfego
 * pago), viaja pelo cadastro e fica gravada na barbearia/salão para adaptar
 * também a página do cliente final.
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

/**
 * Vocabulário e imagens padrão da página do cliente final, por vertical.
 * A vertical barber preserva exatamente os textos e fotos históricos —
 * mudar aqui é mudar a página de todos os tenants daquela vertical.
 */
export const VERTICAL_COPY = {
  barber: {
    /** Eyebrow da seção de serviços. */
    servicesEyebrow: "Menu da casa",
    /** Frase da faixa de ambiente (parallax). */
    ambienceQuote: "Tradição no corte, precisão no detalhe.",
    /** Nota da tela de sucesso do agendamento. */
    confirmationNote:
      "A barbearia vai confirmar seu horário. Guarde os detalhes:",
    /** CTA de contato pós-reserva. */
    talkToBusiness: "Falar com a barbearia",
    /** Assinatura do rodapé público. */
    madeWith: "Feito com NexoBarber",
    madeWithHref: "/",
    /** Fotos padrão (quando o dono não enviou banner) e fallbacks locais. */
    heroPhoto: REAL_PHOTOS.interior,
    heroFallback: STOCK_PHOTOS.barberChair,
    ambiencePhoto: REAL_PHOTOS.razorShave,
    ambienceFallback: STOCK_PHOTOS.beardTrim,
  },
  salon: {
    servicesEyebrow: "Menu de beleza",
    ambienceQuote: "Beleza no detalhe, cuidado em cada gesto.",
    confirmationNote: "O salão vai confirmar seu horário. Guarde os detalhes:",
    talkToBusiness: "Falar com o salão",
    madeWith: "Feito com NexoBeleza",
    madeWithHref: "/salao",
    heroPhoto: SALON_PHOTOS.hairStyling,
    heroFallback: SALON_STOCK.blush,
    ambiencePhoto: SALON_PHOTOS.blowout,
    ambienceFallback: SALON_STOCK.petals,
  },
} as const satisfies Record<VerticalKey, Record<string, string>>;

export type VerticalCopy = (typeof VERTICAL_COPY)[VerticalKey];

/** Copy da vertical com fallback seguro para barber. */
export function verticalCopy(value: unknown): VerticalCopy {
  return VERTICAL_COPY[normalizeVertical(value)];
}
