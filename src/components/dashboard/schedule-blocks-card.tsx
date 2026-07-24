"use client";

import { useActionState, useState } from "react";
import { CalendarOff, Trash2 } from "lucide-react";
import {
  createScheduleBlock,
  deleteScheduleBlock,
} from "@/modules/availability/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ScheduleBlockRow = {
  id: string;
  professionalName: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
};

/**
 * Folgas, férias e bloqueios pontuais (Fase 1): período por profissional,
 * com opção de dia(s) inteiro(s). O bloqueio some da disponibilidade pública
 * e do lançamento manual na hora; horários já marcados não são cancelados.
 */
export function ScheduleBlocksCard({
  professionals,
  blocks,
  timezone,
}: {
  professionals: Array<{ id: string; name: string }>;
  blocks: ScheduleBlockRow[];
  timezone: string;
}) {
  const [state, formAction, pending] = useActionState(createScheduleBlock, {
    success: false,
    message: "",
  } satisfies ActionState);
  const [allDay, setAllDay] = useState(true);
  const rangeFormat = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const formatRange = (startsAt: string, endsAt: string) =>
    `${rangeFormat.format(new Date(startsAt))} → ${rangeFormat.format(new Date(endsAt))}`;

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-3 rounded-xl border p-4">
        {state.message ? (
          <Alert variant={state.success ? "default" : "destructive"}>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="block-professional">Profissional</Label>
            <select
              id="block-professional"
              name="professionalId"
              required
              className="border-input bg-background h-11 w-full rounded-lg border px-2 text-sm"
            >
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="block-reason">Motivo (opcional)</Label>
            <Input
              id="block-reason"
              name="reason"
              placeholder="Folga, férias, consulta…"
              maxLength={200}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="block-date">De</Label>
            <Input
              id="block-date"
              name="date"
              type="date"
              required
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="block-end-date">Até (opcional, para férias)</Label>
            <Input
              id="block-end-date"
              name="endDate"
              type="date"
              className="h-11"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="allDay"
            checked={allDay}
            onChange={(event) => setAllDay(event.target.checked)}
            className="size-4 rounded border"
          />
          Dia(s) inteiro(s)
        </label>
        {!allDay ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="block-start-time">Das</Label>
              <Input
                id="block-start-time"
                name="startTime"
                type="time"
                required
                className="h-11 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="block-end-time">Até</Label>
              <Input
                id="block-end-time"
                name="endTime"
                type="time"
                required
                className="h-11 font-mono"
              />
            </div>
          </div>
        ) : null}
        <Button type="submit" disabled={pending}>
          <CalendarOff className="size-4" />
          {pending ? "Bloqueando…" : "Criar bloqueio"}
        </Button>
      </form>

      {blocks.length ? (
        <div className="space-y-2">
          {blocks.map((block) => (
            <div
              key={block.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {block.professionalName}
                  {block.reason ? (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · {block.reason}
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatRange(block.startsAt, block.endsAt)}
                </p>
              </div>
              <form action={deleteScheduleBlock}>
                <input type="hidden" name="id" value={block.id} />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remover bloqueio de ${block.professionalName}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
          Nenhum bloqueio futuro. Folgas e férias aparecem aqui.
        </p>
      )}
    </div>
  );
}
