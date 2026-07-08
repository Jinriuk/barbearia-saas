import { expect, test } from "@playwright/test";
import { fetchPublicData, TENANT } from "./helpers";

test.describe("páginas públicas", () => {
  test("landing carrega com a proposta do produto", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("página da barbearia mostra hero e serviços", async ({ page }) => {
    test.skip(
      !(await fetchPublicData()),
      "Supabase inalcançável deste ambiente",
    );
    const response = await page.goto(`/${TENANT}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    await expect(
      page.locator(`a[href^="/${TENANT}/agendar"]`).first(),
    ).toBeVisible();
  });

  test("página de agendamento mostra o passo 1 com serviços", async ({
    page,
  }) => {
    test.skip(
      !(await fetchPublicData()),
      "Supabase inalcançável deste ambiente",
    );
    const response = await page.goto(`/${TENANT}/agendar`);
    expect(response?.status()).toBe(200);
    await expect(page.getByText("Escolha o serviço")).toBeVisible();
    await expect(page.locator("button[aria-pressed]").first()).toBeVisible();
  });

  test("slug inexistente devolve 404 de verdade", async ({ page }) => {
    const response = await page.goto("/barbearia-que-nao-existe-e2e");
    expect(response?.status()).toBe(404);
  });
});

test.describe("autenticação", () => {
  test("dashboard sem sessão redireciona para o login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login renderiza o formulário", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });
});
