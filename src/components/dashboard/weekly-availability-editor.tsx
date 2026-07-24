"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { saveWeeklyAvailability } from "@/modules/availability/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export type WeeklyRule = {
  weekday: number;
  startsAt: string;
  endsAt: string;
  slotIntervalMinutes: number;
};

const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const INTERVALS = [10, 15, 20, 30, 45, 60];

let nextKey = 0;
type Window = WeeklyRule & { key: number };

/**
 * Editor de expediente semanal (Fase 1): janelas por dia (turnos divididos),
 * dia sem janela = fechado. Turnos que cruzam a meia-noite não são
 * suportados — o servidor também rejeita. Salvar substitui o conjunto do
 * profissional de forma transacional e NUNCA cancela horários já marcados.
 */
export function WeeklyAvailabilityEditor({
  professionalId,
  initialRules,
}: {
  professionalId: string;
  initialRules: WeeklyRule[];
}) {
  const [windows, setWindows] = useState<Window[]>(() =>
    initialRules.map((rule) => ({ ...rule, key: nextKey++ })),
  );
  const [state, formAction, pending] = useActionState(saveWeeklyAvailability, {
    success: false,
    message: "",
  } satisfies ActionState);

  function addWindow(weekday: number) {
    const existing = windows.filter((w) => w.weekday === weekday);
    const last = existing[existing.length - 1];
    // Sugere um turno da tarde depois do turno existente.
    const startsAt = last
      ? last.endsAt < "14:00"
        ? "14:00"
        : last.endsAt
      : "09:00";
    const endsAt = last ? "18:00" : "18:00";
    setWindows((prev) => [
      ...prev,
      {
        key: nextKey++,
        weekday,
        startsAt,
        endsAt,
        slotIntervalMinutes: last?.slotIntervalMinutes ?? 15,
      },
    ]);
  }

  function updateWindow(key: number, patch: Partial<WeeklyRule>) {
    setWindows((prev) =>
      prev.map((w) => (w.key === key ? { ...w, ...patch } : w)),
    );
  }

  function removeWindow(key: number) {
    setWindows((prev) => prev.filter((w) => w.key !== key));
  }

  const rulesJson = JSON.stringify(
    windows.map((w) => ({
      weekday: w.weekday,
      startsAt: w.startsAt,
      endsAt: w.endsAt,
      slotIntervalMinutes: w.slotIntervalMinutes,
    })),
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="professionalId" value={professionalId} />
      <input type="hidden" name="rules" value={rulesJson} />

      {state.message ? (
        <Alert variant={state.success ? "default" : "destructive"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-3">
        {WEEKDAYS.map((label, weekday) => {
          const dayWindows = windows
            .filter((w) => w.weekday === weekday)
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
          const closed = dayWindows.length === 0;
          return (
            <div
              key={weekday}
              className="rounded-xl border p-3 sm:flex sm:items-start sm:gap-4"
            >
              <div className="flex items-center justify-between sm:w-32 sm:shrink-0 sm:pt-2">
                <p className="text-sm font-medium">{label}</p>
                {closed ? (
                  <span className="text-muted-foreground text-xs sm:hidden">
                    Fechado
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex-1 space-y-2 sm:mt-0">
                {closed ? (
                  <p className="text-muted-foreground hidden pt-2 text-sm sm:block">
                    Fechado
                  </p>
                ) : (
                  dayWindows.map((w) => (
                    <div
                      key={w.key}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input
                        type="time"
                        value={w.startsAt}
                        aria-label={`${label}: início da janela`}
                        onChange={(event) =>
                          updateWindow(w.key, { startsAt: event.target.value })
                        }
                        className="border-input bg-background h-11 rounded-lg border px-2 font-mono text-sm"
                      />
                      <span className="text-muted-foreground text-sm">às</span>
                      <input
                        type="time"
                        value={w.endsAt}
                        aria-label={`${label}: fim da janela`}
                        onChange={(event) =>
                          updateWindow(w.key, { endsAt: event.target.value })
                        }
                        className="border-input bg-background h-11 rounded-lg border px-2 font-mono text-sm"
                      />
                      <select
                        value={w.slotIntervalMinutes}
                        aria-label={`${label}: intervalo entre horários`}
                        onChange={(event) =>
                          updateWindow(w.key, {
                            slotIntervalMinutes: Number(event.target.value),
                          })
                        }
                        className="border-input bg-background h-11 rounded-lg border px-2 text-sm"
                      >
                        {INTERVALS.map((minutes) => (
                          <option key={minutes} value={minutes}>
                            a cada {minutes} min
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Remover janela de ${label}`}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeWindow(w.key)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addWindow(weekday)}
                >
                  <Plus className="size-3.5" />
                  {closed ? "Abrir dia" : "Adicionar turno"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar expediente"}
        </Button>
        <p className="text-muted-foreground text-xs">
          Salvar não cancela horários já marcados.
        </p>
      </div>
    </form>
  );
}
