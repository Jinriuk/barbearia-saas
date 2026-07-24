"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { CalendarClock, LoaderCircle } from "lucide-react";
import {
  getManualSlots,
  rescheduleAppointment,
} from "@/modules/appointments/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const DAY_MS = 86_400_000;

function buildDayOptions(todayInTz: string) {
  const [year, month, day] = todayInTz.split("-").map(Number);
  const base = Date.UTC(year, month - 1, day);
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  });
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(base + index * DAY_MS);
    return {
      value: date.toISOString().slice(0, 10),
      dayNumber: date.getUTCDate(),
      weekday:
        index === 0
          ? "Hoje"
          : index === 1
            ? "Amanhã"
            : weekday.format(date).replace(".", ""),
    };
  });
}

/**
 * Remarcação pela equipe (Fase 2): usa a MESMA fonte de disponibilidade da
 * página pública (getManualSlots → RPC) e confirma via RPC transacional —
 * em conflito, o horário anterior é preservado e a mensagem explica.
 */
export function RescheduleSheet({
  appointmentId,
  serviceId,
  professionalId,
  todayInTz,
  timezone,
}: {
  appointmentId: string;
  serviceId: string;
  professionalId: string;
  todayInTz: string;
  timezone: string;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Array<{ starts_at: string }>>([]);
  const [slot, setSlot] = useState("");
  const [loading, startLoading] = useTransition();
  const [loadError, setLoadError] = useState("");
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await rescheduleAppointment(prev, formData);
      if (result.success) setOpen(false);
      return result;
    },
    { success: false, message: "" } satisfies ActionState,
  );

  const days = useMemo(() => buildDayOptions(todayInTz), [todayInTz]);
  const timeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
      }),
    [timezone],
  );

  function pickDate(value: string) {
    setDate(value);
    setSlot("");
    setLoadError("");
    startLoading(async () => {
      const result = await getManualSlots(serviceId, professionalId, value);
      if ("error" in result) {
        setSlots([]);
        setLoadError(result.error);
      } else {
        setSlots(result.slots);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="ghost" className="text-muted-foreground">
          <CalendarClock className="size-3.5" /> Remarcar
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Remarcar atendimento</SheetTitle>
          <SheetDescription>
            O horário atual só é liberado quando o novo for confirmado.
          </SheetDescription>
        </SheetHeader>
        <form action={formAction} className="flex flex-1 flex-col gap-4 p-4">
          {state.message && !state.success ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <input type="hidden" name="id" value={appointmentId} />
          <input type="hidden" name="startsAt" value={slot} />

          <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
            {days.map((day) => (
              <button
                key={day.value}
                type="button"
                aria-pressed={date === day.value}
                onClick={() => pickDate(day.value)}
                className={cn(
                  "flex w-14 shrink-0 snap-start flex-col items-center gap-0.5 rounded-xl border py-2.5 transition-all",
                  date === day.value
                    ? "bg-primary/15 text-primary border-transparent"
                    : "hover:border-primary/40",
                )}
              >
                <span className="text-[10px] font-medium capitalize opacity-60">
                  {day.weekday}
                </span>
                <span className="text-base font-semibold">{day.dayNumber}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <LoaderCircle className="size-4 animate-spin" /> Buscando
              horários…
            </p>
          ) : null}
          {loadError ? (
            <p className="text-destructive text-sm">{loadError}</p>
          ) : null}
          {!loading && date && !slots.length && !loadError ? (
            <p className="text-muted-foreground text-sm">
              Nenhum horário livre nesse dia.
            </p>
          ) : null}
          {!loading && slots.length ? (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((item) => (
                <button
                  key={item.starts_at}
                  type="button"
                  aria-pressed={slot === item.starts_at}
                  onClick={() => setSlot(item.starts_at)}
                  className={cn(
                    "h-10 rounded-lg border font-mono text-sm transition-all",
                    slot === item.starts_at
                      ? "bg-primary/15 text-primary border-transparent font-semibold"
                      : "hover:border-primary/40",
                  )}
                >
                  {timeFormat.format(new Date(item.starts_at))}
                </button>
              ))}
            </div>
          ) : null}

          <SheetFooter className="mt-auto px-0">
            <Button
              type="submit"
              className="w-full"
              disabled={!slot || pending}
            >
              {pending ? "Remarcando…" : "Confirmar novo horário"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
