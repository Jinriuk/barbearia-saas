"use client";

import { useActionState } from "react";
import { saveBookingRules, saveOpeningHours } from "@/modules/settings/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: ActionState = { success: false, message: "" };

export type BookingRules = {
  bookingNoticeMinutes: number;
  cancellationNoticeMinutes: number;
  bookingHorizonDays: number;
  bookingConfirmationMode: "manual" | "auto";
  maxPendingPerClient: number;
};

/**
 * Regras de agendamento (Fase 1): tudo que a página pública obedece.
 * O modo de confirmação muda o status com que a reserva nasce e o texto
 * mostrado ao cliente — a promessa sempre corresponde ao comportamento.
 */
export function BookingRulesForm({ initial }: { initial: BookingRules }) {
  const [state, formAction, pending] = useActionState(
    saveBookingRules,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Regras de agendamento</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.message ? (
            <Alert variant={state.success ? "default" : "destructive"}>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="rules-confirmation">Confirmação da reserva</Label>
            <select
              id="rules-confirmation"
              name="bookingConfirmationMode"
              defaultValue={initial.bookingConfirmationMode}
              className="border-input bg-background h-11 w-full rounded-lg border px-3 text-sm"
            >
              <option value="manual">
                Manual — a equipe confirma cada reserva (recomendado)
              </option>
              <option value="auto">
                Automática — a reserva já entra confirmada na agenda
              </option>
            </select>
            <p className="text-muted-foreground text-xs">
              A página de agendamento sempre mostra ao cliente o modo escolhido.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rules-notice">
                Antecedência mínima (minutos)
              </Label>
              <Input
                id="rules-notice"
                name="bookingNoticeMinutes"
                type="number"
                min={0}
                max={10080}
                defaultValue={initial.bookingNoticeMinutes}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rules-horizon">
                Agendar até (dias no futuro)
              </Label>
              <Input
                id="rules-horizon"
                name="bookingHorizonDays"
                type="number"
                min={1}
                max={365}
                defaultValue={initial.bookingHorizonDays}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rules-cancel">
                Cancelamento até (minutos antes)
              </Label>
              <Input
                id="rules-cancel"
                name="cancellationNoticeMinutes"
                type="number"
                min={0}
                max={10080}
                defaultValue={initial.cancellationNoticeMinutes}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rules-pending">
                Reservas em aberto por cliente
              </Label>
              <Input
                id="rules-pending"
                name="maxPendingPerClient"
                type="number"
                min={1}
                max={10}
                defaultValue={initial.maxPendingPerClient}
                required
                className="h-11"
              />
            </div>
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar regras"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const WEEKDAYS: Array<{ key: string; label: string }> = [
  { key: "monday", label: "Segunda" },
  { key: "tuesday", label: "Terça" },
  { key: "wednesday", label: "Quarta" },
  { key: "thursday", label: "Quinta" },
  { key: "friday", label: "Sexta" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

/**
 * Texto de horário de funcionamento exibido na página pública. A
 * disponibilidade real de reserva vem do expediente dos profissionais
 * (Equipe → Horários e folgas).
 */
export function OpeningHoursForm({
  initial,
}: {
  initial: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(
    saveOpeningHours,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Horário de funcionamento</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.message ? (
            <Alert variant={state.success ? "default" : "destructive"}>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <p className="text-muted-foreground text-sm">
            Texto informativo da página pública (deixe vazio para dia fechado).
            Os horários reservados de verdade seguem o expediente de cada
            profissional.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day.key}
                className="flex items-center justify-between gap-3"
              >
                <Label htmlFor={`hours-${day.key}`} className="w-20 shrink-0">
                  {day.label}
                </Label>
                <Input
                  id={`hours-${day.key}`}
                  name={day.key}
                  placeholder="09:00–19:00"
                  defaultValue={initial[day.key] ?? ""}
                  maxLength={40}
                  className="h-11"
                />
              </div>
            ))}
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar horários"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
