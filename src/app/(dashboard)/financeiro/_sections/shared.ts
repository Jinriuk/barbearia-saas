import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResolvedPeriod } from "@/lib/dates/period";
import type { CashFlowPoint } from "@/components/dashboard/cash-flow-chart";

export function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const DAY_MS = 86_400_000;

/** Períodos curtos rendem barra por dia; longos, por mês. */
export function bucketKind(period: {
  start: Date;
  end: Date;
}): "day" | "month" {
  const days = (period.end.getTime() - period.start.getTime()) / DAY_MS;
  return days <= 62 ? "day" : "month";
}

type SeriesRow = { bucket_start: string; received: number; expenses: number };

/**
 * Monta os pontos do gráfico do §7.5 (item 3.3) já com a comparação: a
 * janela anterior tem a mesma duração, então o ponto N de uma corresponde ao
 * ponto N da outra. É o que permite tracejar "mesmo dia do período passado"
 * sem inventar alinhamento por calendário.
 */
export async function loadCashFlowSeries(
  supabase: SupabaseClient,
  tenantId: string,
  timezone: string,
  period: ResolvedPeriod,
): Promise<CashFlowPoint[]> {
  const bucket = bucketKind(period);

  const [{ data: currentRows }, { data: previousRows }] = await Promise.all([
    supabase.rpc("cash_flow_series", {
      p_barbershop: tenantId,
      p_from: period.start.toISOString(),
      p_to: period.end.toISOString(),
      p_timezone: timezone,
      p_bucket: bucket,
    }),
    supabase.rpc("cash_flow_series", {
      p_barbershop: tenantId,
      p_from: period.previous.start.toISOString(),
      p_to: period.previous.end.toISOString(),
      p_timezone: timezone,
      p_bucket: bucket,
    }),
  ]);

  const buckets = buildBuckets(period.start, period.end, bucket, timezone);
  const previousBuckets = buildBuckets(
    period.previous.start,
    period.previous.end,
    bucket,
    timezone,
  );

  const currentByKey = indexRows(currentRows as SeriesRow[] | null);
  const previousByKey = indexRows(previousRows as SeriesRow[] | null);

  const labelFmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    ...(bucket === "day"
      ? { day: "2-digit", month: "2-digit" }
      : { month: "short" }),
  });

  return buckets.map((key, index) => {
    const current = currentByKey.get(key);
    const previousKey = previousBuckets[index];
    const previous = previousKey ? previousByKey.get(previousKey) : undefined;
    return {
      label: labelFmt.format(new Date(`${key}T12:00:00Z`)).replace(".", ""),
      received: Number(current?.received ?? 0),
      expenses: Number(current?.expenses ?? 0),
      previousReceived: Number(previous?.received ?? 0),
    };
  });
}

function indexRows(rows: SeriesRow[] | null) {
  return new Map(
    (rows ?? []).map((row) => [String(row.bucket_start).slice(0, 10), row]),
  );
}

/**
 * Chaves de bucket (YYYY-MM-DD) cobrindo a janela, no fuso do tenant — as
 * mesmas que `date_trunc(... at time zone ...)` devolve no banco.
 */
function buildBuckets(
  start: Date,
  end: Date,
  bucket: "day" | "month",
  timeZone: string,
): string[] {
  const isoInTz = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);

  const startIso = isoInTz(start);
  // O fim da janela é exclusivo; o último bucket é o do instante anterior.
  const lastIso = isoInTz(new Date(end.getTime() - 1));
  const keys: string[] = [];

  // Limite de segurança: uma janela absurda (anos em dias) não pode travar o
  // render. 400 buckets já é mais do que qualquer gráfico legível comporta.
  if (bucket === "month") {
    let [year, month] = startIso.split("-").map(Number);
    const [lastYear, lastMonth] = lastIso.split("-").map(Number);
    while (
      (year < lastYear || (year === lastYear && month <= lastMonth)) &&
      keys.length < 400
    ) {
      keys.push(`${year}-${String(month).padStart(2, "0")}-01`);
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
    return keys;
  }

  let cursor = startIso;
  while (cursor <= lastIso && keys.length < 400) {
    keys.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return keys;
}

function addDays(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}
