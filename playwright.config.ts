import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// O runner do Playwright não lê .env.local (isso é papel do Next); os testes
// de API precisam das variáveis públicas do Supabase, então carregamos aqui.
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

// Suíte E2E: roda contra BASE_URL (padrão: servidor local de produção).
// Os testes são read-only por padrão; o único teste de escrita (criar
// agendamento público) exige E2E_ALLOW_WRITES=1 para não sujar dados.
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: "http://localhost:3000/api/health",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
