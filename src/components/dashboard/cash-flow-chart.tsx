import { formatBRL } from "@/lib/financial";

export type CashFlowPoint = {
  label: string;
  received: number;
  expenses: number;
  /** Mesma posição na janela anterior — a linha tracejada de comparação. */
  previousReceived: number;
};

/**
 * Gráfico do §7.5 (Fase 3 — item 3.3): recebido em verde, despesas em coral,
 * período anterior tracejado em cinza.
 *
 * SVG renderizado no servidor. O sinal de tema deste projeto é a classe
 * `dark` no <html> (aplicada por PanelTheme) — não `prefers-color-scheme` nem
 * `data-theme`, que é onde o gráfico antigo erra (item 1.2 da Fase 1).
 */
export function CashFlowChart({
  data,
  previousLabel,
}: {
  data: CashFlowPoint[];
  previousLabel: string;
}) {
  const max = Math.max(
    1,
    ...data.map((point) =>
      Math.max(point.received, point.expenses, point.previousReceived),
    ),
  );
  const width = 720;
  const height = 260;
  const padX = 20;
  const padTop = 26;
  const padBottom = 38;
  const plotH = height - padTop - padBottom;
  const slot = (width - padX * 2) / Math.max(1, data.length);
  const barW = Math.min(18, (slot * 0.7) / 2);
  const baseY = padTop + plotH;

  const totals = data.reduce(
    (acc, point) => ({
      received: acc.received + point.received,
      expenses: acc.expenses + point.expenses,
      previous: acc.previous + point.previousReceived,
    }),
    { received: 0, expenses: 0, previous: 0 },
  );
  const hasData = totals.received > 0 || totals.expenses > 0;

  const cx = (index: number) => padX + slot * index + slot / 2;
  const y = (value: number) => baseY - (value / max) * plotH;
  const previousPath = data
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${cx(index)},${y(point.previousReceived)}`,
    )
    .join(" ");

  // Só rotula um subconjunto do eixo quando há muitos períodos, senão os
  // rótulos se sobrepõem no celular.
  const labelStep = Math.ceil(data.length / 12);

  return (
    <div className="cashchart">
      <style>{`
        .cashchart {
          --in:#047857; --out:#c2453a; --prev:#77828e;
          --ink:#4a5561; --muted:#77828e; --base:#ddd8cf;
        }
        .dark .cashchart {
          --in:#34d399; --out:#fb8072; --prev:#8b98a7;
          --ink:#b8c2cc; --muted:#8b98a7; --base:#2c3948;
        }
      `}</style>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-sm"
            style={{ background: "var(--in)" }}
          />
          Recebido
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-sm"
            style={{ background: "var(--out)" }}
          />
          Despesas
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden="true">
            <line
              x1="0"
              y1="4"
              x2="18"
              y2="4"
              stroke="var(--prev)"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
          </svg>
          Recebido no {previousLabel}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Recebido ${formatBRL(totals.received)}, despesas ${formatBRL(totals.expenses)} e recebido no ${previousLabel} ${formatBRL(totals.previous)} ao longo do período.`}
      >
        <line
          x1={padX}
          y1={baseY}
          x2={width - padX}
          y2={baseY}
          stroke="var(--base)"
          strokeWidth={1}
        />
        {data.map((point, index) => {
          const center = cx(index);
          const inH = (point.received / max) * plotH;
          const outH = (point.expenses / max) * plotH;
          return (
            <g key={`${point.label}-${index}`}>
              {point.received > 0 ? (
                <rect
                  x={center - barW - 1}
                  y={baseY - inH}
                  width={barW}
                  height={inH}
                  rx={3}
                  fill="var(--in)"
                />
              ) : null}
              {point.expenses > 0 ? (
                <rect
                  x={center + 1}
                  y={baseY - outH}
                  width={barW}
                  height={outH}
                  rx={3}
                  fill="var(--out)"
                />
              ) : null}
              {index % labelStep === 0 ? (
                <text
                  x={center}
                  y={height - 14}
                  textAnchor="middle"
                  fontSize={11}
                  fill="var(--muted)"
                >
                  {point.label}
                </text>
              ) : null}
            </g>
          );
        })}
        {totals.previous > 0 ? (
          <path
            d={previousPath}
            fill="none"
            stroke="var(--prev)"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinejoin="round"
          />
        ) : null}
      </svg>

      {hasData ? (
        <p className="text-muted-foreground mt-1 text-xs">
          No período: recebido {formatBRL(totals.received)} · despesas{" "}
          {formatBRL(totals.expenses)} · no {previousLabel} o recebido foi{" "}
          {formatBRL(totals.previous)}.
        </p>
      ) : (
        <p className="text-muted-foreground py-2 text-center text-sm">
          Sem movimento no período escolhido.
        </p>
      )}
    </div>
  );
}
