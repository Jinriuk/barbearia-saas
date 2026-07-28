import type { Permission } from "@/lib/permissions";

export type NavEntry = {
  href: string;
  label: string;
  permission?: Permission;
};

/**
 * Os 7 destinos do menu lateral (§9.1). O ícone de cada um fica no
 * dashboard-shell; aqui ficam só href, rótulo e permissão, para que a
 * vistoria de rotas (src/app/routes.test.ts) possa contar os destinos sem
 * esbarrar nos links do cabeçalho e da faixa de assinatura.
 */
export const MAIN_NAV: (NavEntry & { mobileLabel?: string })[] = [
  { href: "/dashboard", label: "Início" },
  { href: "/agenda", label: "Agenda" },
  { href: "/clientes", label: "Clientes", permission: "clients:manage" },
  { href: "/financeiro", label: "Financeiro", permission: "finance:view" },
  { href: "/servicos", label: "Serviços e produtos", mobileLabel: "Serviços" },
  { href: "/profissionais", label: "Equipe" },
  {
    href: "/configuracoes",
    label: "Configurações",
    mobileLabel: "Ajustes",
    permission: "settings:manage",
  },
];

/**
 * Navegação do §9 (Fase 1.14).
 *
 * O menu lateral tinha 15 destinos onde o guia pede 7, e quatro dos sete
 * nomes prescritos existiam só como cabeçalho de grupo inerte — "Financeiro"
 * era rótulo de seção e o link real chamava-se "Resumo e caixa".
 *
 * Agora o menu tem exatamente os 7 itens do §9.1 e cada um leva a uma tela
 * de verdade. As rotas que saíram do menu não sumiram: viram navegação de
 * seção dentro da própria área (SECTION_NAV abaixo), o que mantém tudo
 * alcançável sem inflar a hierarquia. A Fase 3.1 substitui essa faixa pelas
 * seções internas do §7.5.
 */
export type SectionKey = "financeiro" | "catalogo" | "equipe";

export const SECTION_NAV: Record<SectionKey, NavEntry[]> = {
  financeiro: [
    {
      href: "/financeiro",
      label: "Resumo e caixa",
      permission: "finance:view",
    },
    { href: "/contas-a-pagar", label: "Despesas", permission: "finance:view" },
    {
      href: "/contas-a-receber",
      label: "A receber",
      permission: "finance:view",
    },
    { href: "/comissoes", label: "Comissões", permission: "finance:view" },
    { href: "/relatorios", label: "Relatórios", permission: "reports:view" },
  ],
  catalogo: [
    { href: "/servicos", label: "Serviços" },
    {
      href: "/planos",
      label: "Planos de clientes",
      permission: "clients:manage",
    },
    {
      href: "/produtos",
      label: "Produtos e estoque",
      permission: "catalog:manage",
    },
    // Fase 2.6: a venda de balcão é uma tela de operação, não de cadastro —
    // mora na área do catálogo, sem virar um oitavo item do menu lateral.
    { href: "/vendas", label: "Nova venda", permission: "inventory:manage" },
  ],
  equipe: [
    { href: "/profissionais", label: "Profissionais" },
    {
      href: "/equipe/horarios",
      label: "Horários e folgas",
      permission: "appointments:manage",
    },
    {
      href: "/permissoes",
      label: "Permissões",
      permission: "memberships:manage",
    },
  ],
};
