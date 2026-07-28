import { describe, expect, it } from "vitest";
import {
  availableUnits,
  bookingSteps,
  buildIcsCalendar,
  confirmationPhrase,
  confirmationTitle,
  isSoldOut,
  paymentPreferenceLabel,
} from ".";
import { openingHoursList } from "../opening-hours";

// 2026-07-14T18:00:00Z = terça-feira, 14 de julho, 15:00 em São Paulo (UTC-3).
const STARTS_AT = "2026-07-14T18:00:00.000Z";
const TZ = "America/Sao_Paulo";

describe("etapas do fluxo público (§7.11)", () => {
  it("tem 7 etapas na ordem do guia quando há produto para oferecer", () => {
    expect(bookingSteps(true).map((step) => step.key)).toEqual([
      "service",
      "professional",
      "datetime",
      "contact",
      "extras",
      "payment",
      "review",
    ]);
  });

  it("cai para 6 sem upsell, e a numeração segue contínua", () => {
    const steps = bookingSteps(false);
    expect(steps).toHaveLength(6);
    expect(steps.some((step) => step.key === "extras")).toBe(false);
    // "Seus dados" continua vindo antes de pagamento e revisão.
    expect(steps.map((step) => step.key)).toEqual([
      "service",
      "professional",
      "datetime",
      "contact",
      "payment",
      "review",
    ]);
  });

  it("marca só a etapa de extras como opcional", () => {
    const optional = bookingSteps(true).filter((step) => step.optional);
    expect(optional.map((step) => step.key)).toEqual(["extras"]);
  });
});

describe("tela final", () => {
  it("usa os textos exatos do guia para cada modo de confirmação", () => {
    expect(confirmationTitle("confirmed")).toBe("Horário confirmado");
    expect(confirmationTitle("pending")).toBe("Pedido de horário enviado");
  });

  it("monta a frase falada com dia, hora e profissional", () => {
    expect(
      confirmationPhrase({
        startsAt: STARTS_AT,
        professionalName: "João",
        timezone: TZ,
      }),
    ).toBe("Terça-feira, 15h, com João");
  });

  it("mostra os minutos quando o horário não é cheio", () => {
    expect(
      confirmationPhrase({
        startsAt: "2026-07-14T18:30:00.000Z",
        professionalName: null,
        timezone: TZ,
      }),
    ).toBe("Terça-feira, 15h30");
  });

  it("nunca promete pagamento online — sempre no local", () => {
    expect(paymentPreferenceLabel("pix")).toBe("No local — Pix");
    expect(paymentPreferenceLabel("card")).toBe("No local — Cartão");
    expect(paymentPreferenceLabel(null)).toBe("No local, a combinar");
    expect(paymentPreferenceLabel("gateway")).toBe("No local, a combinar");
  });
});

describe("arquivo de calendário (.ics)", () => {
  const calendar = buildIcsCalendar({
    uid: "AB12CD@barbearia",
    startsAt: STARTS_AT,
    endsAt: "2026-07-14T18:40:00.000Z",
    summary: "Corte; barba, completo",
    description: "Com João",
    location: "Rua A, 100",
    confirmed: true,
    now: new Date("2026-07-10T12:00:00.000Z"),
  });

  it("gera um VCALENDAR válido com CRLF", () => {
    expect(calendar.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(calendar.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(calendar).toContain("BEGIN:VEVENT");
    expect(calendar).toContain("DTSTART:20260714T180000Z");
    expect(calendar).toContain("DTEND:20260714T184000Z");
    expect(calendar).toContain("DTSTAMP:20260710T120000Z");
  });

  it("escapa ponto e vírgula e vírgula no texto (RFC 5545)", () => {
    expect(calendar).toContain("SUMMARY:Corte\\; barba\\, completo");
    expect(calendar).toContain("LOCATION:Rua A\\, 100");
  });

  it("reserva pendente entra como TENTATIVE, não como confirmada", () => {
    const pending = buildIcsCalendar({
      uid: "x@y",
      startsAt: STARTS_AT,
      endsAt: STARTS_AT,
      summary: "Corte",
      confirmed: false,
    });
    expect(pending).toContain("STATUS:TENTATIVE");
    expect(calendar).toContain("STATUS:CONFIRMED");
  });

  it("dobra linhas acima de 75 octetos", () => {
    const long = buildIcsCalendar({
      uid: "x@y",
      startsAt: STARTS_AT,
      endsAt: STARTS_AT,
      summary: "C".repeat(200),
      confirmed: true,
    });
    for (const line of long.split("\r\n")) {
      expect(line.length).toBeLessThanOrEqual(75);
    }
  });
});

describe("horário de funcionamento", () => {
  it("devolve só os dias preenchidos, na ordem da semana", () => {
    expect(
      openingHoursList({
        saturday: "09:00–14:00",
        monday: "09:00–19:00",
        sunday: "  ",
      }),
    ).toEqual([
      { key: "monday", label: "Segunda", value: "09:00–19:00" },
      { key: "saturday", label: "Sábado", value: "09:00–14:00" },
    ]);
  });

  it("aguenta ausência do dado sem quebrar a página", () => {
    expect(openingHoursList(null)).toEqual([]);
    expect(openingHoursList({})).toEqual([]);
  });
});

describe("saldo público do produto", () => {
  it("produto sem controle de estoque nunca fica indisponível", () => {
    // A barbearia que não usa o módulo de estoque não pode ter a vitrine
    // inteira marcada como esgotada — foi a regressão que null evita.
    expect(availableUnits(null)).toBe(Infinity);
    expect(isSoldOut(null)).toBe(false);
  });

  it("produto controlado sem saldo aparece como indisponível", () => {
    expect(isSoldOut(0)).toBe(true);
    expect(isSoldOut(-3)).toBe(true);
    expect(isSoldOut(2)).toBe(false);
    expect(availableUnits(2)).toBe(2);
  });

  it("vitrine de uma versão antiga da RPC não trava o carrinho", () => {
    // Sem o campo, o comportamento tem de ser o de sempre: vender.
    expect(availableUnits(undefined)).toBe(Infinity);
    expect(isSoldOut(undefined)).toBe(false);
  });
});
