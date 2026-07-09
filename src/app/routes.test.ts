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
  join(__dirname, "..", "components", "layout", "user-menu.tsx"),
  join(DASHBOARD_DIR, "dashboard", "page.tsx"),
  join(DASHBOARD_DIR, "financeiro", "page.tsx"),
  join(DASHBOARD_DIR, "relatorios", "page.tsx"),
  join(DASHBOARD_DIR, "permissoes", "page.tsx"),
  join(DASHBOARD_DIR, "profissionais", "page.tsx"),
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

  for (const file of SOURCES) {
    it(`links de ${file.split("/").slice(-2).join("/")} apontam para rotas existentes`, () => {
      expect(existsSync(file)).toBe(true);
      for (const href of staticHrefs(file)) {
        expect(routes.has(href), `rota inexistente: ${href}`).toBe(true);
      }
    });
  }

  it("menu principal cobre as rotas essenciais", () => {
    const shell = readFileSync(SOURCES[0], "utf8");
    for (const essential of [
      "/dashboard",
      "/agenda",
      "/financeiro",
      "/clientes",
      "/servicos",
      "/produtos",
      "/profissionais",
      "/configuracoes",
    ]) {
      expect(shell.includes(`"${essential}"`), `faltando no menu: ${essential}`).toBe(
        true,
      );
    }
  });
});
