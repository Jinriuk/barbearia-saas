import { formatBRL } from "@/lib/financial";

export type MonthlyRevenuePoint = {
  label: string;
  service: number;
  product: number;
};

const compact = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * Evolução mensal da receita (serviços vs produtos), empilhada.
 * SVG server-side, theme-aware. Cores categóricas validadas (dataviz):
 * azul = serviços, aqua = produtos. Legenda + rótulos diretos atendem à
 * regra de relevo (contraste do aqua no claro fica abaixo de 3:1).
 */
export function MonthlyRevenueChart({ data }: { data: MonthlyRevenuePoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.service + d.product));
  const width = 640;
  const height = 240;
  const padX = 16;
  const padTop = 24;
  const padBottom = 34;
  const plotH = height - padTop - padBottom;
  const slot = (width - padX * 2) / data.length;
  const barW = Math.min(46, slot * 0.55);
  const hasData = data.some((d) => d.service + d.product > 0);

  return (
    <div className="revchart">
      <style>{`
        .revchart { --svc:#2a78d6; --prd:#1baf7a; --ink:#52514e; --muted:#898781; --base:#c3c2b7; }
        @media (prefers-color-scheme: dark) {
          .revchart { --svc:#3987e5; --prd:#199e70; --ink:#c3c2b7; --muted:#898781; --base:#383835; }
        }
        :root[data-theme="dark"] .revchart { --svc:#3987e5; --prd:#199e70; --ink:#c3c2b7; --muted:#898781; --base:#383835; }
        :root[data-theme="light"] .revchart { --svc:#2a78d6; --prd:#1baf7a; --ink:#52514e; --muted:#898781; --base:#c3c2b7; }
      `}</style>
      <div className="mb-3 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-sm"
            style={{ background: "var(--svc)" }}
          />
          Serviços
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-sm"
            style={{ background: "var(--prd)" }}
          />
          Produtos
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Evolução mensal da receita por serviços e produtos"
      >
        <line
          x1={padX}
          y1={padTop + plotH}
          x2={width - padX}
          y2={padTop + plotH}
          stroke="var(--base)"
          strokeWidth={1}
        />
        {data.map((point, index) => {
          const total = point.service + point.product;
          const cx = padX + slot * index + slot / 2;
          const x = cx - barW / 2;
          const svcH = (point.service / max) * plotH;
          const prdH = (point.product / max) * plotH;
          const gap = point.service > 0 && point.product > 0 ? 2 : 0;
          const baseY = padTop + plotH;
          const svcY = baseY - svcH;
          const prdY = svcY - gap - prdH;
          return (
            <g key={point.label}>
              {point.service > 0 ? (
                <rect
                  x={x}
                  y={svcY}
                  width={barW}
                  height={svcH}
                  rx={4}
                  fill="var(--svc)"
                />
              ) : null}
              {point.product > 0 ? (
                <rect
                  x={x}
                  y={prdY}
                  width={barW}
                  height={prdH}
                  rx={4}
                  fill="var(--prd)"
                />
              ) : null}
              {total > 0 ? (
                <text
                  x={cx}
                  y={(point.product > 0 ? prdY : svcY) - 6}
                  textAnchor="middle"
                  fontSize={11}
                  fill="var(--ink)"
                >
                  {compact.format(total)}
                </text>
              ) : null}
              <text
                x={cx}
                y={height - 12}
                textAnchor="middle"
                fontSize={11}
                fill="var(--muted)"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
      {!hasData ? (
        <p className="text-muted-foreground py-2 text-center text-sm">
          Ainda sem receita nos últimos meses. Conclua atendimentos para ver a
          evolução aqui.
        </p>
      ) : (
        <p className="text-muted-foreground mt-1 text-right text-xs">
          Total no período:{" "}
          {formatBRL(data.reduce((s, d) => s + d.service + d.product, 0))}
        </p>
      )}
    </div>
  );
}
