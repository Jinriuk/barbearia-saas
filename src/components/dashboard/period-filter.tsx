import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { PERIOD_PRESETS, type ResolvedPeriod } from "@/lib/dates/period";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Barra de período (Fase 3 — item 3.2). Atalhos + intervalo livre.
 *
 * É um `<form method="get">`: sem JavaScript de cliente, o filtro continua
 * funcionando, e cada escolha vira uma URL que o dono consegue guardar nos
 * favoritos ("minha quinzena"). Os campos ocultos preservam a seção aberta.
 */
export function PeriodFilter({
  basePath,
  period,
  hidden = {},
}: {
  basePath: string;
  period: ResolvedPeriod;
  /** Parâmetros que precisam sobreviver à troca de período (ex.: seção). */
  hidden?: Record<string, string | undefined>;
}) {
  const extra = Object.entries(hidden).filter(([, value]) =>
    Boolean(value),
  ) as [string, string][];
  const query = (params: Record<string, string>) => {
    const search = new URLSearchParams();
    for (const [key, value] of extra) search.set(key, value);
    for (const [key, value] of Object.entries(params)) search.set(key, value);
    return `${basePath}?${search.toString()}`;
  };

  return (
    <div className="bg-card rounded-xl border p-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex flex-wrap gap-1.5">
          {PERIOD_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              asChild
              size="sm"
              variant={period.key === preset.value ? "default" : "ghost"}
              className={cn(
                "h-9",
                period.key !== preset.value && "text-muted-foreground",
              )}
            >
              <Link href={query({ periodo: preset.value })}>
                {preset.label}
              </Link>
            </Button>
          ))}
        </div>

        <form
          method="get"
          action={basePath}
          className="flex flex-wrap items-end gap-2"
        >
          {extra.map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
          <div className="flex items-center gap-2">
            <label
              htmlFor="periodo-de"
              className="text-muted-foreground text-xs"
            >
              De
            </label>
            <input
              id="periodo-de"
              type="date"
              name="de"
              defaultValue={period.fromInput}
              className="border-input bg-background h-9 rounded-lg border px-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="periodo-ate"
              className="text-muted-foreground text-xs"
            >
              até
            </label>
            <input
              id="periodo-ate"
              type="date"
              name="ate"
              defaultValue={period.toInput}
              className="border-input bg-background h-9 rounded-lg border px-2 text-sm"
            />
          </div>
          <Button size="sm" variant="outline" className="h-9">
            <CalendarRange className="size-4" /> Aplicar
          </Button>
        </form>

        <p className="text-muted-foreground ml-auto text-xs">
          Mostrando{" "}
          <span className="text-foreground font-medium">{period.label}</span>
        </p>
      </div>
    </div>
  );
}
