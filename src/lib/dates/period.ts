import {
  getUtcDayRange,
  getUtcMonthRange,
  getUtcWeekRange,
  zonedDateTimeToUtc,
} from "@/lib/dates";

/**
 * Filtro de período do Financeiro (Fase 3 — item 3.2).
 *
 * Até aqui o Financeiro só sabia ler mês fechado. Metade das barbearias paga
 * a equipe por quinzena, e quinzena não é mês: sem intervalo livre o dono
 * fecha no papel. Este módulo resolve `?periodo=`/`?de=`/`?ate=` num par de
 * instantes UTC calculados no fuso do tenant, mais a janela anterior de
 * MESMA DURAÇÃO — que é o que as comparações do §5.4 exigem.
 */

export const PERIOD_PRESETS = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mês" },
  { value: "mes-passado", label: "Mês passado" },
  { value: "30d", label: "Últimos 30 dias" },
] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number]["value"];

export type PeriodParams = {
  periodo?: string;
  de?: string;
  ate?: string;
};

export type ResolvedPeriod = {
  /** Preset ativo, ou "personalizado" quando veio de/até válidos. */
  key: PeriodPreset | "personalizado";
  label: string;
  start: Date;
  end: Date;
  /** Valores para preencher os campos de data da barra de filtro. */
  fromInput: string;
  toInput: string;
  /** Janela imediatamente anterior, de mesma duração. */
  previous: { start: Date; end: Date };
  previousLabel: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const dayFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const monthFmt = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function dateInTz(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Soma dias a uma data ISO (YYYY-MM-DD) sem passar por fuso. */
function addDays(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

function startOfDay(isoDate: string, timeZone: string) {
  return zonedDateTimeToUtc(isoDate, "00:00", timeZone);
}

/**
 * Janela anterior de mesma duração, encostada no início da atual: um período
 * de 15 dias compara com os 15 dias anteriores, não com "o mês passado".
 */
function previousWindow(start: Date, end: Date) {
  const span = end.getTime() - start.getTime();
  return { start: new Date(start.getTime() - span), end: new Date(start) };
}

function labelForRange(start: Date, endExclusive: Date) {
  // O fim é exclusivo; o rótulo mostra o último dia incluído.
  const lastDay = new Date(endExclusive.getTime() - 1);
  const first = dayFmt.format(start);
  const last = dayFmt.format(lastDay);
  return first === last ? first : `${first} a ${last}`;
}

export function resolvePeriod(
  timeZone: string,
  params: PeriodParams = {},
  now = new Date(),
): ResolvedPeriod {
  const from = params.de?.trim();
  const to = params.ate?.trim();

  // Intervalo livre tem precedência: se o dono digitou as datas, é isso que
  // ele quer ver, independente do preset que ficou na URL.
  if (from && to && ISO_DATE.test(from) && ISO_DATE.test(to)) {
    const [rangeStart, rangeEnd] = from <= to ? [from, to] : [to, from];
    const start = startOfDay(rangeStart, timeZone);
    // `ate` é inclusivo para quem lê a tela; internamente vira exclusivo.
    const end = startOfDay(addDays(rangeEnd, 1), timeZone);
    return {
      key: "personalizado",
      label: labelForRange(start, end),
      start,
      end,
      fromInput: rangeStart,
      toInput: rangeEnd,
      previous: previousWindow(start, end),
      previousLabel: "período anterior",
    };
  }

  const preset = (PERIOD_PRESETS.find((item) => item.value === params.periodo)
    ?.value ?? "mes") as PeriodPreset;

  const withInputs = (
    key: PeriodPreset,
    label: string,
    start: Date,
    end: Date,
    previousLabel: string,
  ): ResolvedPeriod => ({
    key,
    label,
    start,
    end,
    fromInput: dateInTz(start, timeZone),
    toInput: dateInTz(new Date(end.getTime() - 1), timeZone),
    previous: previousWindow(start, end),
    previousLabel,
  });

  if (preset === "hoje") {
    const range = getUtcDayRange(timeZone, now);
    return withInputs("hoje", "Hoje", range.start, range.end, "ontem");
  }

  if (preset === "semana") {
    const range = getUtcWeekRange(timeZone, now);
    return withInputs(
      "semana",
      labelForRange(range.start, range.end),
      range.start,
      range.end,
      "semana anterior",
    );
  }

  if (preset === "30d") {
    const today = getUtcDayRange(timeZone, now);
    const startIso = addDays(dateInTz(now, timeZone), -29);
    const start = startOfDay(startIso, timeZone);
    return withInputs(
      "30d",
      labelForRange(start, today.end),
      start,
      today.end,
      "30 dias anteriores",
    );
  }

  if (preset === "mes-passado") {
    const current = getUtcMonthRange(timeZone, undefined, now);
    const key =
      current.month === 1
        ? `${current.year - 1}-12`
        : `${current.year}-${String(current.month - 1).padStart(2, "0")}`;
    const range = getUtcMonthRange(timeZone, key, now);
    return withInputs(
      "mes-passado",
      capitalize(
        monthFmt.format(new Date(Date.UTC(range.year, range.month - 1, 1))),
      ),
      range.start,
      range.end,
      "mês anterior",
    );
  }

  const range = getUtcMonthRange(timeZone, undefined, now);
  return withInputs(
    "mes",
    capitalize(
      monthFmt.format(new Date(Date.UTC(range.year, range.month - 1, 1))),
    ),
    range.start,
    range.end,
    "mês anterior",
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Reconstrói a query string do período para links internos das seções. */
export function periodQuery(period: ResolvedPeriod): string {
  if (period.key === "personalizado") {
    return `de=${period.fromInput}&ate=${period.toInput}`;
  }
  return `periodo=${period.key}`;
}
