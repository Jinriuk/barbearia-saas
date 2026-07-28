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
 * Evolução mensal do recebido (serviços vs produtos), empilhada.
 *
 * Fase 1.2 — o componente decidia a cor por `prefers-color-scheme` e por um
 * `:root[data-theme]` que nada no sistema definia, então num aparelho com
 * tema claro do sistema ele desenhava texto cinza-escuro sobre o cartão
 * escuro. A correção é não decidir cor nenhuma: usar os tokens, que já viram
 * com o tema. Isso também conserta o reuso no PDF de fundo branco, que roda
 * fora do painel e portanto no tema claro.
 *
 * Cores da tabela obrigatória do §6.1: verde de "recebido" para serviços e
 * dourado de faturamento para produtos — os dois lados são dinheiro que
 * entrou. A Fase 3.3 troca o eixo por recebido × despesas e acrescenta o
 * período anterior tracejado.
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
    <div>
      <div className="mb-3 flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="bg-chart-received inline-block size-2.5 rounded-sm" />
          Serviços
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-chart-billed inline-block size-2.5 rounded-sm" />
          Produtos
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Evolução mensal do recebido por serviços e produtos"
      >
        <line
          x1={padX}
          y1={padTop + plotH}
          x2={width - padX}
          y2={padTop + plotH}
          stroke="var(--border-control)"
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
              {/* §6.2/§12: todo gráfico precisa de tooltip. <title> dentro do
                  <g> cobre a coluna inteira, inclusive o espaço vazio. */}
              <title>
                {`${point.label}: ${formatBRL(total)} — serviços ${formatBRL(
                  point.service,
                )}, produtos ${formatBRL(point.product)}`}
              </title>
              <rect
                x={cx - slot / 2}
                y={padTop}
                width={slot}
                height={plotH}
                fill="transparent"
              />
              {point.service > 0 ? (
                <rect
                  x={x}
                  y={svcY}
                  width={barW}
                  height={svcH}
                  rx={4}
                  fill="var(--chart-received)"
                />
              ) : null}
              {point.product > 0 ? (
                <rect
                  x={x}
                  y={prdY}
                  width={barW}
                  height={prdH}
                  rx={4}
                  fill="var(--chart-billed)"
                />
              ) : null}
              {total > 0 ? (
                <text
                  x={cx}
                  y={(point.product > 0 ? prdY : svcY) - 6}
                  textAnchor="middle"
                  fontSize={12}
                  fill="var(--foreground)"
                >
                  {compact.format(total)}
                </text>
              ) : null}
              <text
                x={cx}
                y={height - 12}
                textAnchor="middle"
                fontSize={12}
                fill="var(--foreground-subtle)"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
      {!hasData ? (
        <p className="text-muted-foreground py-2 text-center text-sm">
          Ainda sem recebimento nos últimos meses. Conclua atendimentos para ver
          a evolução aqui.
        </p>
      ) : (
        <p className="text-foreground-subtle mt-1 text-right text-sm">
          Total no período:{" "}
          {formatBRL(data.reduce((s, d) => s + d.service + d.product, 0))}
        </p>
      )}
    </div>
  );
}
