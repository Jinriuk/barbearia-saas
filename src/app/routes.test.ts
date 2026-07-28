import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Vistoria contínua de fiação: todo link interno estático do painel precisa
 * apontar para uma rota que existe. Evita "botão quebrado" quando uma rota é
 * renomeada ou removida.
 */

const APP_DIR = join(__dirname);
const DASHBOARD_DIR = join(APP_DIR, "(dashboard)");

/** Rotas do painel que existem de fato (pasta com page.tsx). */
function dashboardRoutes(): Set<string> {
  return new Set(
    readdirSync(DASHBOARD_DIR, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          existsSync(join(DASHBOARD_DIR, entry.name, "page.tsx")),
      )
      .map((entry) => `/${entry.name}`),
  );
}

/** Extrai hrefs internos estáticos ("/algo") de um arquivo-fonte. */
function staticHrefs(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const matches = [
    ...source.matchAll(/href:\s*"(\/[a-z0-9-]*)"/g),
    ...source.matchAll(/href="(\/[a-z0-9-]*)"/g),
  ];
  return matches.map((match) => match[1]);
}

const SOURCES = [
  join(__dirname, "..", "components", "layout", "dashboard-shell.tsx"),
  join(__dirname, "..", "lib", "navigation.ts"),
  join(__dirname, "..", "components", "layout", "user-menu.tsx"),
  join(DASHBOARD_DIR, "dashboard", "page.tsx"),
  join(DASHBOARD_DIR, "financeiro", "page.tsx"),
  join(DASHBOARD_DIR, "relatorios", "page.tsx"),
  join(DASHBOARD_DIR, "permissoes", "page.tsx"),
  join(DASHBOARD_DIR, "profissionais", "page.tsx"),
  join(APP_DIR, "salao", "page.tsx"),
];

describe("integridade dos links do painel", () => {
  const routes = dashboardRoutes();
  // Rotas fora de (dashboard) que também são alvos válidos de link.
  routes.add("/");
  routes.add("/login");
  routes.add("/cadastro");
  routes.add("/recuperar-senha");
  routes.add("/relatorio-financeiro");
  routes.add("/admin");
  routes.add("/salao");
  // Páginas legais — grupo de rota (legal).
  routes.add("/privacidade");
  routes.add("/termos");
  // Demos públicas — rota dinâmica [tenant].
  routes.add("/aurora");
  routes.add("/studio-aurora");

  for (const file of SOURCES) {
    it(`links de ${file.split("/").slice(-2).join("/")} apontam para rotas existentes`, () => {
      expect(existsSync(file)).toBe(true);
      for (const href of staticHrefs(file)) {
        expect(routes.has(href), `rota inexistente: ${href}`).toBe(true);
      }
    });
  }

  // Desde a Fase 1.14 o menu lateral tem exatamente os 7 destinos do §9.1;
  // as demais telas vivem na navegação de seção (src/lib/navigation.ts).
  const SHELL = join(
    __dirname,
    "..",
    "components",
    "layout",
    "dashboard-shell.tsx",
  );
  const SECTION_NAV = join(__dirname, "..", "lib", "navigation.ts");

  it("menu lateral tem exatamente os 7 destinos do §9.1", async () => {
    const { MAIN_NAV } = await import("@/lib/navigation");
    expect(MAIN_NAV.map((item) => item.href)).toEqual([
      "/dashboard",
      "/agenda",
      "/clientes",
      "/financeiro",
      "/servicos",
      "/profissionais",
      "/configuracoes",
    ]);
    // O ícone de cada destino precisa existir no shell, senão o item cai no
    // ícone genérico sem ninguém perceber.
    const shell = readFileSync(SHELL, "utf8");
    for (const item of MAIN_NAV) {
      expect(
        shell.includes(`"${item.href}":`),
        `sem ícone no menu: ${item.href}`,
      ).toBe(true);
    }
  });

  it("as telas que saíram do menu continuam alcançáveis por seção", () => {
    const section = readFileSync(SECTION_NAV, "utf8");
    for (const essential of [
      "/contas-a-pagar",
      "/contas-a-receber",
      "/comissoes",
      "/relatorios",
      "/planos",
      "/produtos",
      "/equipe/horarios",
      "/permissoes",
    ]) {
      expect(
        section.includes(`"${essential}"`),
        `rota órfã: ${essential}`,
      ).toBe(true);
    }
  });
});
