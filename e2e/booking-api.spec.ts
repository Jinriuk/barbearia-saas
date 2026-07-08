import { expect, test } from "@playwright/test";
import { fetchPublicData, TENANT } from "./helpers";

test.describe("APIs públicas", () => {
  test("health responde 200", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
  });

  test("availability rejeita parâmetros inválidos com 400", async ({
    request,
  }) => {
    const response = await request.get(
      `/api/public/${TENANT}/availability?serviceId=x&professionalId=y&date=z`,
    );
    expect(response.status()).toBe(400);
  });

  test("appointments rejeita payload inválido com 400 e aponta os campos", async ({
    request,
  }) => {
    const response = await request.post(`/api/public/${TENANT}/appointments`, {
      data: { clientName: "E2E" },
    });
    expect(response.status()).toBe(400);
    const body = (await response.json()) as { error: string; fields?: object };
    expect(body.error).toBeTruthy();
    expect(body.fields).toBeTruthy();
  });

  test("availability devolve lista de slots para dados reais", async ({
    request,
  }) => {
    const data = await fetchPublicData();
    test.skip(!data, "Supabase inalcançável deste ambiente");
    const professional = data!.professionals.find(
      (item) => item.serviceIds.length > 0,
    );
    test.skip(!professional, "nenhum profissional com serviço vinculado");
    const serviceId = professional!.serviceIds[0];
    const date = new Date(Date.now() + 2 * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const response = await request.get(
      `/api/public/${TENANT}/availability?serviceId=${serviceId}&professionalId=${professional!.id}&date=${date}`,
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { slots: unknown[] };
    expect(Array.isArray(body.slots)).toBe(true);
  });

  test("cria agendamento público de ponta a ponta (escrita)", async ({
    request,
  }) => {
    test.skip(
      process.env.E2E_ALLOW_WRITES !== "1",
      "escrita desabilitada (defina E2E_ALLOW_WRITES=1)",
    );
    const data = await fetchPublicData();
    test.skip(!data, "Supabase inalcançável deste ambiente");
    const professional = data!.professionals.find(
      (item) => item.serviceIds.length > 0,
    );
    test.skip(!professional, "nenhum profissional com serviço vinculado");
    const serviceId = professional!.serviceIds[0];
    const date = new Date(Date.now() + 2 * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const availability = await request.get(
      `/api/public/${TENANT}/availability?serviceId=${serviceId}&professionalId=${professional!.id}&date=${date}`,
    );
    const { slots } = (await availability.json()) as {
      slots: Array<{ starts_at: string }>;
    };
    test.skip(!slots?.length, "sem horário livre no dia escolhido");

    const response = await request.post(`/api/public/${TENANT}/appointments`, {
      data: {
        serviceId,
        professionalId: professional!.id,
        startsAt: slots[slots.length - 1].starts_at,
        clientName: "Cliente E2E Playwright",
        clientPhone: "11900009999",
        notes: "Criado pela suíte E2E — pode remover.",
      },
    });
    expect(response.status()).toBe(201);
  });
});
