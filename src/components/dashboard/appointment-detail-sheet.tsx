"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  CheckCheck,
  Check,
  CircleUser,
  MessageCircle,
  Play,
  RotateCcw,
  ShoppingBag,
  UserX,
} from "lucide-react";
import {
  completeAndReceiveAppointment,
  setAppointmentStatus,
} from "@/modules/appointments/actions";
import { PAYMENT_METHODS, formatBRL } from "@/lib/financial";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AppointmentStatusBadge } from "@/components/dashboard/appointment-status-badge";
import { RescheduleSheet } from "@/components/dashboard/reschedule-sheet";

export type AgendaAppointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  clientId: string | null;
  clientName: string;
  clientPhone: string | null;
  serviceId: string | null;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  price: number;
  notes: string | null;
  productCount: number;
  productTotal: number;
  /** Minuto do dia (fuso do negócio) — coordenada do cartão na grade. */
  startMinute: number;
  endMinute: number;
  dateKey: string;
};

const initialState: ActionState = { success: false, message: "" };

/**
 * Detalhe do atendimento (§7.2): clicar no cartão abre isto, e daqui saem
 * TODAS as ações do balcão — inclusive "Iniciar" e "Finalizar e receber",
 * que antes não existiam.
 */
export function AppointmentDetailSheet({
  appointment,
  open,
  onOpenChange,
  timezone,
  todayInTz,
  canManage,
  whatsappHref,
}: {
  appointment: AgendaAppointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timezone: string;
  todayInTz: string;
  canManage: boolean;
  whatsappHref?: string | null;
}) {
  const [statusState, statusAction, statusPending] = useActionState(
    setAppointmentStatus,
    initialState,
  );
  const [receiveState, receiveAction, receivePending] = useActionState(
    completeAndReceiveAppointment,
    initialState,
  );
  const [showReceive, setShowReceive] = useState(false);

  const timeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
      }),
    [timezone],
  );
  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        timeZone: timezone,
        weekday: "long",
        day: "2-digit",
        month: "long",
      }),
    [timezone],
  );

  if (!appointment) return null;

  const started = new Date(appointment.startsAt) <= new Date();
  const status = appointment.status;
  const feedback = receiveState.message ? receiveState : statusState;
  const busy = statusPending || receivePending;

  const statusButton = (
    next: string,
    label: string,
    Icon: typeof Check,
    variant: "default" | "outline" | "ghost" | "secondary" = "outline",
    className?: string,
  ) => (
    <StatusButton
      action={statusAction}
      appointmentId={appointment.id}
      next={next}
      label={label}
      icon={Icon}
      variant={variant}
      className={className}
      disabled={busy}
    />
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setShowReceive(false);
      }}
    >
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="font-mono text-2xl">
                {timeFormat.format(new Date(appointment.startsAt))} –{" "}
                {timeFormat.format(new Date(appointment.endsAt))}
              </SheetTitle>
              <SheetDescription className="capitalize">
                {dateFormat.format(new Date(appointment.startsAt))}
              </SheetDescription>
            </div>
            <AppointmentStatusBadge status={status} />
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {feedback.message ? (
            <Alert variant={feedback.success ? "default" : "destructive"}>
              <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-xl border p-4">
            <p className="text-lg font-semibold">{appointment.clientName}</p>
            {appointment.clientPhone ? (
              <p className="text-muted-foreground font-mono text-sm">
                {appointment.clientPhone}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {appointment.clientId ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/clientes/${appointment.clientId}`}>
                    <CircleUser className="size-3.5" /> Ver cliente
                  </Link>
                </Button>
              ) : null}
              {whatsappHref ? (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="text-emerald-700 dark:text-emerald-400"
                >
                  <a href={whatsappHref} target="_blank" rel="noreferrer">
                    <MessageCircle className="size-3.5" /> WhatsApp
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Serviço</dt>
              <dd className="text-right font-medium">
                {appointment.serviceName}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Profissional</dt>
              <dd className="text-right font-medium">
                {appointment.professionalName}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Valor do serviço</dt>
              <dd className="text-right font-mono font-semibold">
                {formatBRL(appointment.price)}
              </dd>
            </div>
            {appointment.productCount > 0 ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground inline-flex items-center gap-1.5">
                  <ShoppingBag className="size-3.5" />
                  Produtos reservados
                </dt>
                <dd className="text-right font-mono font-semibold">
                  {appointment.productCount} ·{" "}
                  {formatBRL(appointment.productTotal)}
                </dd>
              </div>
            ) : null}
          </dl>

          {appointment.notes ? (
            <p className="bg-muted/40 rounded-lg border p-3 text-sm">
              {appointment.notes}
            </p>
          ) : null}

          {appointment.productCount > 0 ? (
            <p className="text-muted-foreground text-xs">
              Os produtos reservados são confirmados em Produtos e Estoque — é
              lá que a baixa acontece.
            </p>
          ) : null}

          {canManage ? (
            <div className="mt-2 space-y-2">
              {status === "pending"
                ? statusButton(
                    "confirmed",
                    "Confirmar horário",
                    Check,
                    "default",
                  )
                : null}

              {status === "confirmed" && started
                ? statusButton(
                    "in_progress",
                    "Iniciar atendimento",
                    Play,
                    "default",
                  )
                : null}

              {(status === "confirmed" || status === "in_progress") &&
              started ? (
                showReceive ? (
                  <form
                    action={receiveAction}
                    className="space-y-2 rounded-xl border p-3"
                  >
                    <input type="hidden" name="id" value={appointment.id} />
                    <Label htmlFor="receive-method">
                      Como o cliente pagou?
                    </Label>
                    <select
                      id="receive-method"
                      name="paymentMethod"
                      required
                      defaultValue=""
                      className="border-input bg-background h-11 w-full rounded-md border px-3 text-base sm:text-sm"
                    >
                      <option value="" disabled>
                        Escolha a forma de pagamento
                      </option>
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="submit"
                      className="h-11 w-full"
                      disabled={busy}
                    >
                      <CheckCheck className="size-4" />
                      Receber {formatBRL(appointment.price)}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 w-full"
                      onClick={() => setShowReceive(false)}
                    >
                      Voltar
                    </Button>
                  </form>
                ) : (
                  <Button
                    type="button"
                    className="h-11 w-full justify-start"
                    onClick={() => setShowReceive(true)}
                    disabled={busy}
                  >
                    <CheckCheck className="size-4" />
                    Finalizar e receber
                  </Button>
                )
              ) : null}

              {(status === "confirmed" || status === "in_progress") && started
                ? statusButton(
                    "completed",
                    "Concluir sem receber agora",
                    CheckCheck,
                  )
                : null}

              {(status === "pending" || status === "confirmed") && started
                ? statusButton(
                    "no_show",
                    "Não compareceu",
                    UserX,
                    "outline",
                    "text-rose-600 dark:text-rose-400",
                  )
                : null}

              {status === "in_progress"
                ? statusButton(
                    "confirmed",
                    "Desfazer início",
                    RotateCcw,
                    "ghost",
                    "text-muted-foreground",
                  )
                : null}
              {status === "completed"
                ? statusButton(
                    "confirmed",
                    "Desfazer conclusão",
                    RotateCcw,
                    "ghost",
                    "text-muted-foreground",
                  )
                : null}
              {status === "no_show"
                ? statusButton(
                    "confirmed",
                    "Desfazer falta",
                    RotateCcw,
                    "ghost",
                    "text-muted-foreground",
                  )
                : null}

              {(status === "pending" || status === "confirmed") &&
              appointment.serviceId ? (
                <RescheduleSheet
                  appointmentId={appointment.id}
                  serviceId={appointment.serviceId}
                  professionalId={appointment.professionalId}
                  todayInTz={todayInTz}
                  timezone={timezone}
                />
              ) : null}

              {status === "pending" ||
              status === "confirmed" ||
              status === "in_progress"
                ? statusButton(
                    "canceled",
                    "Cancelar horário",
                    Ban,
                    "ghost",
                    "text-muted-foreground",
                  )
                : null}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Botão de mudança de situação. Vive fora do componente de propósito: criado
 * dentro do render, ele perderia estado a cada renderização.
 */
function StatusButton({
  action,
  appointmentId,
  next,
  label,
  icon: Icon,
  variant,
  className,
  disabled,
}: {
  action: (formData: FormData) => void;
  appointmentId: string;
  next: string;
  label: string;
  icon: typeof Check;
  variant: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  disabled: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={appointmentId} />
      <input type="hidden" name="status" value={next} />
      <Button
        type="submit"
        variant={variant}
        disabled={disabled}
        className={cn("h-11 w-full justify-start", className)}
      >
        <Icon className="size-4" />
        {label}
      </Button>
    </form>
  );
}
