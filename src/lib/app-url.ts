/**
 * URL pública canônica da aplicação — fonte única para metadataBase,
 * robots e sitemap. O fallback cobre build sem env; em produção
 * NEXT_PUBLIC_APP_URL deve apontar para o domínio real.
 */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://barbearia-saas-sigma.vercel.app";
