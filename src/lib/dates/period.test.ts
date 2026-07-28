import { describe, expect, it } from "vitest";
import { periodQuery, resolvePeriod } from "@/lib/dates/period";

const TZ = "America/Sao_Paulo";
// Quinta-feira, 16/07/2026, 15h em São Paulo (18h UTC).
const NOW = new Date("2026-07-16T18:00:00.000Z");
const DAY_MS = 86_400_000;

describe("filtro de período do Financeiro", () => {
  it("cai no mês corrente quando nada é informado", () => {
    const period = resolvePeriod(TZ, {}, NOW);

    expect(period.key).toBe("mes");
    expect(period.start.toISOString()).toBe("2026-07-01T03:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-08-01T03:00:00.000Z");
    expect(period.label).toBe("Julho de 2026");
  });

  it("aceita intervalo livre com o 'até' inclusivo para quem lê a tela", () => {
    // Fechamento de quinzena: 1 a 15 precisa INCLUIR o dia 15 inteiro.
    const period = resolvePeriod(
      TZ,
      { de: "2026-07-01", ate: "2026-07-15" },
      NOW,
    );

    expect(period.key).toBe("personalizado");
    expect(period.start.toISOString()).toBe("2026-07-01T03:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-07-16T03:00:00.000Z");
    expect(period.label).toBe("01/07/2026 a 15/07/2026");
  });

  it("o intervalo livre tem precedência sobre o atalho que ficou na URL", () => {
    const period = resolvePeriod(
      TZ,
      { periodo: "hoje", de: "2026-07-01", ate: "2026-07-15" },
      NOW,
    );

    expect(period.key).toBe("personalizado");
  });

  it("normaliza datas invertidas em vez de devolver janela negativa", () => {
    const period = resolvePeriod(
      TZ,
      { de: "2026-07-15", ate: "2026-07-01" },
      NOW,
    );

    expect(period.fromInput).toBe("2026-07-01");
    expect(period.toInput).toBe("2026-07-15");
    expect(period.end.getTime()).toBeGreaterThan(period.start.getTime());
  });

  it("compara com a janela anterior de MESMA duração, encostada no início", () => {
    // 15 dias comparam com os 15 dias anteriores — não com "o mês passado".
    const period = resolvePeriod(
      TZ,
      { de: "2026-07-01", ate: "2026-07-15" },
      NOW,
    );
    const span = period.end.getTime() - period.start.getTime();
    const previousSpan =
      period.previous.end.getTime() - period.previous.start.getTime();

    expect(previousSpan).toBe(span);
    expect(period.previous.end.getTime()).toBe(period.start.getTime());
  });

  it("'últimos 30 dias' cobre 30 dias terminando hoje", () => {
    const period = resolvePeriod(TZ, { periodo: "30d" }, NOW);
    const days = Math.round(
      (period.end.getTime() - period.start.getTime()) / DAY_MS,
    );

    expect(period.key).toBe("30d");
    expect(days).toBe(30);
    expect(period.toInput).toBe("2026-07-16");
  });

  it("'mês passado' vira dezembro do ano anterior quando estamos em janeiro", () => {
    const january = new Date("2026-01-10T15:00:00.000Z");
    const period = resolvePeriod(TZ, { periodo: "mes-passado" }, january);

    expect(period.label).toBe("Dezembro de 2025");
  });

  it("ignora atalho desconhecido e valor de data malformado", () => {
    expect(resolvePeriod(TZ, { periodo: "ontem-talvez" }, NOW).key).toBe("mes");
    expect(resolvePeriod(TZ, { de: "01/07/2026", ate: "15/07/2026" }, NOW).key).toBe(
      "mes",
    );
  });

  it("a query preserva o período ao trocar de seção", () => {
    expect(periodQuery(resolvePeriod(TZ, { periodo: "semana" }, NOW))).toBe(
      "periodo=semana",
    );
    expect(
      periodQuery(
        resolvePeriod(TZ, { de: "2026-07-01", ate: "2026-07-15" }, NOW),
      ),
    ).toBe("de=2026-07-01&ate=2026-07-15");
  });
});
