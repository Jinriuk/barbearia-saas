import Link from "next/link";
import { ArrowRight, Check, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ActivationStep = {
  label: string;
  description: string;
  href: string;
  done: boolean;
};

/**
 * Jornada de ativação (Fase 1 — §6.3): passos derivados dos dados reais do
 * tenant, então o progresso "retoma" sozinho de onde parou. Some quando a
 * barbearia está pronta para receber reservas.
 */
export function ActivationChecklist({ steps }: { steps: ActivationStep[] }) {
  const doneCount = steps.filter((step) => step.done).length;
  if (doneCount === steps.length) return null;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <Card className="border-primary/40 mb-6">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            Deixe sua página pronta para receber reservas
          </CardTitle>
          <span className="text-muted-foreground text-sm">
            {doneCount} de {steps.length}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso da ativação"
          className="bg-muted mt-2 h-2 w-full overflow-hidden rounded-full"
        >
          <div
            className="bg-primary h-full rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {steps.map((step) => (
          <Link
            key={step.label}
            href={step.href}
            className={cn(
              "group flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
              step.done
                ? "border-transparent opacity-60"
                : "hover:border-primary/50 hover:bg-muted/40",
            )}
          >
            {step.done ? (
              <span className="bg-success/15 text-success grid size-6 shrink-0 place-items-center rounded-full">
                <Check className="size-3.5" />
              </span>
            ) : (
              <Circle className="text-muted-foreground size-6 shrink-0 p-0.5" />
            )}
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block text-sm font-medium",
                  step.done && "line-through",
                )}
              >
                {step.label}
              </span>
              {!step.done ? (
                <span className="text-muted-foreground block truncate text-xs">
                  {step.description}
                </span>
              ) : null}
            </span>
            {!step.done ? (
              <ArrowRight className="text-muted-foreground group-hover:text-foreground size-4 shrink-0" />
            ) : null}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
