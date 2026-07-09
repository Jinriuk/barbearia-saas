"use client";

import { useActionState, useMemo, useState } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  LoaderCircle,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import {
  createManualAppointment,
  getManualSlots,
} from "@/modules/appointments/actions";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type ClientOption = { id: string; name: string; phone: string | null };
type ServiceOption = { id: string; name: string; durationMinutes: number };
type ProfessionalOption = { id: string; name: string; serviceIds: string[] };
type Slot = { starts_at: string };

const DAY_MS = 86_400_000;

/** Próximos 14 dias a partir do "hoje" do fuso do negócio (como no público). */
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

const initialState: ActionState = { success: false, message: "" };

const selectClass =
  "border-input bg-background h-11 w-full rounded-md border px-3 text-base sm:text-sm";

/**
 * Lançamento manual de horário pela equipe: cliente (existente ou novo),
 * serviço, profissional, dia e horário livre — os horários vêm da mesma RPC
 * da página pública, então nunca oferecem um slot já tomado.
 */
export function ManualAppointmentSheet({
  clients,
  services,
  professionals,
  timezone,
  todayInTz,
}: {
  clients: ClientOption[];
  services: ServiceOption[];
  professionals: ProfessionalOption[];
  timezone: string;
  todayInTz: string;
}) {
  const [open, setOpen] = useState(false);
  const [clientMode, setClientMode] = useState<"existing" | "new">(
    clients.length ? "existing" : "new",
  );
  const [clientQuery, setClientQuery] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState("");

  const days = useMemo(() => buildDayOptions(todayInTz), [todayInTz]);

  const clientLabel = (client: ClientOption) =>
    client.phone ? `${client.name} · ${client.phone}` : client.name;
  const selectedClient = useMemo(
    () =>
      clients.find(
        (client) =>
          clientLabel(client).toLowerCase() ===
          clientQuery.trim().toLowerCase(),
      ) ?? null,
    [clients, clientQuery],
  );

  const availableProfessionals = useMemo(
    () =>
      professionals.filter(
        (item) => !serviceId || item.serviceIds.includes(serviceId),
      ),
    [professionals, serviceId],
  );

  const timeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
      }),
    [timezone],
  );

  function resetSchedule() {
    setDate("");
    setSlot("");
    setSlots([]);
    setSlotsError("");
  }

  async function fetchSlots(
    service: string,
    professional: string,
    day: string,
  ) {
    setLoadingSlots(true);
    setSlot("");
    setSlots([]);
    setSlotsError("");
    const result = await getManualSlots(service, professional, day);
    if ("error" in result) setSlotsError(result.error);
    else setSlots(result.slots);
    setLoadingSlots(false);
  }

  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await createManualAppointment(prev, formData);
      if (result.success) {
        setClientQuery("");
        setServiceId("");
        setProfessionalId("");
        resetSchedule();
      } else if (result.message.includes("ocupado")) {
        // Horário tomado no meio do caminho: recarrega a disponibilidade.
        if (serviceId && professionalId && date)
          void fetchSlots(serviceId, professionalId, date);
      }
      return result;
    },
    initialState,
  );

  // No modo "novo cliente" os campos required do formulário fazem a guarda.
  const canSubmit =
    Boolean(slot) &&
    (clientMode === "existing" ? Boolean(selectedClient) : true);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetSchedule();
      }}
    >
      <SheetTrigger asChild>
        <Button>
          <CalendarPlus /> Novo agendamento
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Novo agendamento</SheetTitle>
          <SheetDescription>
            Lance um horário direto na agenda — entra já confirmado.
          </SheetDescription>
        </SheetHeader>
        <form action={formAction} className="flex flex-1 flex-col gap-5 p-4">
          {state.message ? (
            <Alert variant={state.success ? "default" : "destructive"}>
              {state.success ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : null}
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          {/* 1. Cliente */}
          <div className="space-y-2.5">
            <Label>Cliente</Label>
            <div className="flex gap-2">
              <ModePill
                active={clientMode === "existing"}
                onClick={() => setClientMode("existing")}
                icon={<UserRound className="size-4" />}
                label="Já é cliente"
              />
              <ModePill
                active={clientMode === "new"}
                onClick={() => setClientMode("new")}
                icon={<UserRoundPlus className="size-4" />}
                label="Novo cliente"
              />
            </div>
            {clientMode === "existing" ? (
              <div className="space-y-1.5">
                <Input
                  list="manual-appointment-clients"
                  value={clientQuery}
                  onChange={(event) => setClientQuery(event.target.value)}
                  placeholder="Busque por nome ou telefone"
                  className="h-11 text-base sm:text-sm"
                  aria-label="Buscar cliente existente"
                />
                <datalist id="manual-appointment-clients">
                  {clients.map((client) => (
                    <option key={client.id} value={clientLabel(client)} />
                  ))}
                </datalist>
                {selectedClient ? (
                  <>
                    <input
                      type="hidden"
                      name="clientId"
                      value={selectedClient.id}
                    />
                    <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" />
                      {selectedClient.name} selecionado
                    </p>
                  </>
                ) : clientQuery ? (
                  <p className="text-muted-foreground text-xs">
                    Escolha uma opção da lista ou cadastre como novo cliente.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-2.5">
                <Input
                  name="clientName"
                  placeholder="Nome do cliente"
                  autoComplete="off"
                  required
                  className="h-11 text-base sm:text-sm"
                  aria-label="Nome do novo cliente"
                />
                <Input
                  name="clientPhone"
                  inputMode="tel"
                  placeholder="WhatsApp — (11) 98765-4321"
                  autoComplete="off"
                  required
                  className="h-11 text-base sm:text-sm"
                  aria-label="WhatsApp do novo cliente"
                />
              </div>
            )}
          </div>

          {/* 2. Serviço e profissional */}
          <div className="space-y-2.5">
            <Label htmlFor="manual-service">Serviço</Label>
            <select
              id="manual-service"
              name="serviceId"
              required
              value={serviceId}
              onChange={(event) => {
                setServiceId(event.target.value);
                setProfessionalId("");
                resetSchedule();
              }}
              className={selectClass}
            >
              <option value="" disabled>
                Escolha o serviço
              </option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {service.durationMinutes} min
                </option>
              ))}
            </select>
          </div>
          {serviceId ? (
            <div className="space-y-2.5">
              <Label htmlFor="manual-professional">Profissional</Label>
              <select
                id="manual-professional"
                name="professionalId"
                required
                value={professionalId}
                onChange={(event) => {
                  setProfessionalId(event.target.value);
                  resetSchedule();
                }}
                className={selectClass}
              >
                <option value="" disabled>
                  Quem vai atender
                </option>
                {availableProfessionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </select>
              {availableProfessionals.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Nenhum profissional executa esse serviço.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* 3. Dia e horário */}
          {serviceId && professionalId ? (
            <div className="space-y-2.5">
              <Label>Dia e horário</Label>
              <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
                {days.map((day) => {
                  const selected = date === day.value;
                  return (
                    <button
                      key={day.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setDate(day.value);
                        void fetchSlots(serviceId, professionalId, day.value);
                      }}
                      className={cn(
                        "flex w-14 shrink-0 snap-start flex-col items-center gap-0.5 rounded-xl border py-2.5 transition-all active:scale-[.97]",
                        selected
                          ? "bg-primary text-primary-foreground border-transparent shadow-md"
                          : "hover:border-foreground/25",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[11px] font-medium capitalize",
                          selected ? "opacity-80" : "opacity-50",
                        )}
                      >
                        {day.weekday}
                      </span>
                      <span className="text-base font-semibold">
                        {day.dayNumber}
                      </span>
                    </button>
                  );
                })}
              </div>

              {loadingSlots ? (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <LoaderCircle className="size-4 animate-spin" />
                  Buscando horários…
                </p>
              ) : null}
              {slotsError ? (
                <p className="text-sm text-rose-600 dark:text-rose-400">
                  {slotsError}
                </p>
              ) : null}
              {!loadingSlots && date && !slotsError && slots.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2.5 text-sm">
                  Nenhum horário livre nesse dia.
                </p>
              ) : null}
              {!loadingSlots && slots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((item) => {
                    const selected = slot === item.starts_at;
                    return (
                      <button
                        key={item.starts_at}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setSlot(item.starts_at)}
                        className={cn(
                          "h-11 rounded-lg border font-mono text-sm transition-all active:scale-[.96]",
                          selected
                            ? "bg-primary text-primary-foreground border-transparent font-semibold shadow-md"
                            : "hover:border-foreground/25",
                        )}
                      >
                        {timeFormat.format(new Date(item.starts_at))}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <input type="hidden" name="startsAt" value={slot} />
            </div>
          ) : null}

          {/* 4. Observação */}
          {slot ? (
            <div className="space-y-2">
              <Label htmlFor="manual-notes">Observação (opcional)</Label>
              <Textarea
                id="manual-notes"
                name="notes"
                rows={2}
                placeholder="Alguma preferência ou detalhe?"
              />
            </div>
          ) : null}

          <SheetFooter className="mt-auto px-0">
            <Button
              type="submit"
              className="h-12 w-full"
              disabled={!canSubmit || pending}
            >
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <CalendarPlus className="size-4" />
              )}
              Confirmar agendamento
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ModePill({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/5 text-primary"
          : "hover:bg-muted/50",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
