"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, LoaderCircle } from "lucide-react";
import { reschedulePublicReservation } from "@/modules/public-booking/actions";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/types/domain";

type Slot = { starts_at: string; ends_at: string };

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
 * Remarcação pelo próprio cliente (Fase 4). Antes daqui, "remarcar" era um
 * link que mandava cancelar e refazer o fluxo inteiro — e o pilar G1
 * prometia menos mensagens enquanto empurrava todo mundo para o WhatsApp.
 *
 * Mantém serviço e profissional: só o horário muda. Quem quer trocar de
 * profissional faz uma reserva nova, que é o que isso significa de verdade.
 */
export function RescheduleReservation({
  tenant,
  token,
  serviceId,
  professionalId,
  timezone,
  todayInTz,
}: {
  tenant: string;
  token: string;
  serviceId: string;
  professionalId: string;
  timezone: string;
  todayInTz: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [state, formAction, pending] = useActionState(
    reschedulePublicReservation,
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

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  async function loadSlots(day: string) {
    setDate(day);
    setSlot("");
    setSlots([]);
    setLoading(true);
    setLoadError("");
    try {
      const query = new URLSearchParams({
        serviceId,
        professionalId,
        date: day,
      });
      const response = await fetch(
        `/api/public/${tenant}/availability?${query}`,
      );
      const result = (await response.json()) as {
        slots?: Slot[];
        error?: string;
      };
      setSlots(result.slots ?? []);
      if (result.error) setLoadError(result.error);
    } catch {
      setLoadError("Não foi possível consultar os horários.");
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-black/15 text-[15px] font-medium transition-colors hover:bg-black/[.04]"
      >
        <CalendarClock className="size-4.5" />
        Remarcar para outro horário
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
      <p className="text-sm font-medium">Escolha o novo horário</p>
      <p className="mt-1 text-xs opacity-60">
        O serviço e o profissional continuam os mesmos.
      </p>

      <div className="-mx-4 mt-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
        {days.map((day) => {
          const selected = date === day.value;
          return (
            <button
              key={day.value}
              type="button"
              aria-pressed={selected}
              onClick={() => void loadSlots(day.value)}
              className={cn(
                "flex w-16 shrink-0 snap-start flex-col items-center gap-0.5 rounded-2xl border py-3 transition-all active:scale-[.97]",
                selected
                  ? "border-transparent bg-[var(--tenant-secondary)] text-[var(--tenant-on-secondary)] shadow-md shadow-black/10"
                  : "border-black/10 bg-white/50 hover:border-black/25",
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-medium capitalize",
                  selected ? "opacity-75" : "opacity-50",
                )}
              >
                {day.weekday}
              </span>
              <span className="text-lg font-semibold">{day.dayNumber}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm opacity-60">
          <LoaderCircle className="size-4 animate-spin" />
          Buscando horários…
        </p>
      ) : null}

      {!loading && date && slots.length === 0 ? (
        <p className="mt-4 text-sm opacity-70">
          Nenhum horário livre nesse dia. Tente outra data.
        </p>
      ) : null}

      {!loading && slots.length > 0 ? (
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {slots.map((item) => {
            const selected = slot === item.starts_at;
            return (
              <button
                key={item.starts_at}
                type="button"
                aria-pressed={selected}
                onClick={() => setSlot(item.starts_at)}
                className={cn(
                  "h-11 rounded-xl border font-mono text-sm transition-all active:scale-[.96]",
                  selected
                    ? "border-transparent bg-[var(--tenant-secondary)] font-semibold text-[var(--tenant-on-secondary)] shadow-md shadow-black/10"
                    : "border-black/10 bg-white/50 hover:border-black/25",
                )}
              >
                {timeFormat.format(new Date(item.starts_at))}
              </button>
            );
          })}
        </div>
      ) : null}

      {loadError ? (
        <p className="mt-4 text-sm text-red-700">{loadError}</p>
      ) : null}
      {!state.success && state.message ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </p>
      ) : null}

      <form action={formAction} className="mt-4 space-y-2">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="startsAt" value={slot} />
        <button
          type="submit"
          disabled={!slot || pending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--tenant-secondary)] text-[15px] font-semibold text-[var(--tenant-on-secondary)] transition-opacity not-disabled:hover:opacity-90 disabled:opacity-40"
        >
          {pending ? (
            <LoaderCircle className="size-4.5 animate-spin" />
          ) : (
            <CalendarClock className="size-4.5" />
          )}
          Confirmar novo horário
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-11 w-full text-center text-sm underline underline-offset-2 opacity-60"
        >
          Manter o horário atual
        </button>
      </form>
    </div>
  );
}
