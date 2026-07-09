import { describe, expect, it } from "vitest";
import { reminderMessage, reminderWhatsAppHref } from "./whatsapp";

// 2026-07-10T18:00:00Z = sexta-feira, 10 de julho, 15:00 em São Paulo (UTC-3).
const STARTS_AT = "2026-07-10T18:00:00.000Z";

describe("reminderMessage", () => {
  it("formata dia e hora no fuso do tenant", () => {
    const message = reminderMessage(
      {
        clientName: "Ana Paula Souza",
        serviceName: "Escova",
        startsAt: STARTS_AT,
      },
      {
        name: "Studio Aurora",
        timezone: "America/Sao_Paulo",
        vertical: "salon",
      },
    );
    expect(message).toContain("Oi, Ana!");
    expect(message).toContain("no salão Studio Aurora");
    expect(message).toContain("Escova");
    expect(message).toContain("sexta-feira, 10 de julho");
    expect(message).toContain("às 15:00");
  });

  it("usa o termo da vertical barber (e como padrão)", () => {
    const barber = reminderMessage(
      { clientName: "Carlos", serviceName: "Corte", startsAt: STARTS_AT },
      {
        name: "Navalha de Ouro",
        timezone: "America/Sao_Paulo",
        vertical: "barber",
      },
    );
    expect(barber).toContain("na barbearia Navalha de Ouro");

    const fallback = reminderMessage(
      { clientName: "Carlos", serviceName: "Corte", startsAt: STARTS_AT },
      { name: "Navalha de Ouro", timezone: "America/Sao_Paulo" },
    );
    expect(fallback).toContain("na barbearia Navalha de Ouro");
  });

  it("respeita fusos diferentes", () => {
    const manaus = reminderMessage(
      { clientName: "Bia", serviceName: "Manicure", startsAt: STARTS_AT },
      { name: "Espaço Bela", timezone: "America/Manaus", vertical: "salon" },
    );
    expect(manaus).toContain("às 14:00");
  });

  it("aceita Date além de string ISO", () => {
    const message = reminderMessage(
      {
        clientName: "Duda",
        serviceName: "Coloração",
        startsAt: new Date(STARTS_AT),
      },
      {
        name: "Studio Aurora",
        timezone: "America/Sao_Paulo",
        vertical: "salon",
      },
    );
    expect(message).toContain("às 15:00");
  });
});

describe("reminderWhatsAppHref", () => {
  it("monta o wa.me com DDI 55 e mensagem codificada", () => {
    const href = reminderWhatsAppHref("(11) 98765-4321", "Oi, Ana! Até lá!");
    expect(href).toBe(
      `https://wa.me/5511987654321?text=${encodeURIComponent("Oi, Ana! Até lá!")}`,
    );
  });

  it("devolve null sem telefone utilizável", () => {
    expect(reminderWhatsAppHref(null, "msg")).toBeNull();
    expect(reminderWhatsAppHref("123", "msg")).toBeNull();
  });
});
