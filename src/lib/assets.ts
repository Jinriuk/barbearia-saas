// Artes de capa locais: fallback garantido quando uma foto remota falha
// (etapa 14.2) e visual padrão offline-safe.
export const STOCK_PHOTOS = {
  barberChair: "/stock/hero-1.svg",
  barberCut: "/stock/hero-2.svg",
  beardTrim: "/stock/hero-3.svg",
} as const;

// Fotos reais de barbearia (Unsplash, licença livre para uso comercial).
// Elas passam pelo otimizador do next/image — quem busca no CDN é o SERVIDOR
// (images.unsplash.com já está em remotePatterns); o navegador só fala com o
// nosso domínio, então some o erro de DNS do cliente que motivou a etapa
// 14.2. Ainda assim, todo uso passa por <SmartImage/> com fallback local:
// se uma foto sair do ar, a arte SVG correspondente entra no lugar.
export const REAL_PHOTOS = {
  /** Barbeiro finalizando corte, tons escuros. */
  barberCut:
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1600&q=75&auto=format&fit=crop",
  /** Interior clássico de barbearia (cadeiras e espelhos). */
  interior:
    "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1600&q=75&auto=format&fit=crop",
  /** Acabamento de barba na navalha. */
  razorShave:
    "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1600&q=75&auto=format&fit=crop",
  /** Barba sendo aparada de perto. */
  beardTrim:
    "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1600&q=75&auto=format&fit=crop",
  /** Corte com máquina, fundo escuro. */
  clippers:
    "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=1600&q=75&auto=format&fit=crop",
} as const;
