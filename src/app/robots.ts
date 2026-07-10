import type { MetadataRoute } from "next";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://barbearia-saas-sigma.vercel.app";

/**
 * Indexação: landings, páginas legais e páginas públicas dos tenants são
 * indexáveis; painel, admin, APIs e fluxo de auth ficam de fora. Os paths
 * do painel vivem na raiz (grupo de rota), por isso a lista explícita.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: [
        "/api/",
        "/auth/",
        "/admin",
        "/dashboard",
        "/onboarding",
        "/agenda",
        "/assinatura",
        "/clientes",
        "/comissoes",
        "/configuracoes",
        "/contas-a-pagar",
        "/contas-a-receber",
        "/estoque",
        "/financeiro",
        "/minha-conta",
        "/permissoes",
        "/produtos",
        "/profissionais",
        "/relatorios",
        "/relatorio-financeiro",
        "/servicos",
        "/usuarios",
        "/atualizar-senha",
        "/recuperar-senha",
      ],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
