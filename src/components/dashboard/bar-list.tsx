import { formatBRL } from "@/lib/financial";

export type BarItem = { label: string; value: number; hint?: string };

/**
 * Ranking em barras horizontais (top N). Theme-aware via tokens do design
 * system (bg-muted / bg-primary), responsivo e acessível. Usado no financeiro
 * para "mais vendidos" e "maior receita" (etapa 10.4).
 */
export function BarList({
  items,
  format = "currency",
  empty = "Sem dados neste mês.",
}: {
  items: BarItem[];
  format?: "currency" | "number";
  empty?: string;
}) {
  if (!items.length) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">{empty}</p>
    );
  }
  const max = Math.max(1, ...items.map((item) => item.value));
  const fmt = (value: number) =>
    format === "currency" ? formatBRL(value) : value.toLocaleString("pt-BR");

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium">{item.label}</span>
            <span className="text-muted-foreground shrink-0 font-mono">
              {fmt(item.value)}
              {item.hint ? (
                <span className="ml-1 opacity-70">· {item.hint}</span>
              ) : null}
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
