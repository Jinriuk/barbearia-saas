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

/**
 * Valores que a grade da agenda envia ao clicar num espaço vazio (§7.2.4):
 * profissional, dia e horário já vêm decididos pelo clique.
 */
export type ManualAppointmentSeed = {
  professionalId?: string;
  date?: string;
  startsAt?: string;
};

const DAY_MS = 86_400_000;

/** 14 dias a partir da base, com "Hoje"/"Amanhã" medidos no dia do negócio. */
function buildDayOptions(baseKey: string, todayInTz: string) {
  const [year, month, day] = baseKey.split("-").map(Number);
  const base = Date.UTC(year, month - 1, day);
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  });
  const [ty, tm, td] = todayInTz.split("-").map(Number);
  const todayMs = Date.UTC(ty, tm - 1, td);
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(base + index * DAY_MS);
    const distance = Math.round((date.getTime() - todayMs) / DAY_MS);
    return {
      value: date.toISOString().slice(0, 10),
      dayNumber: date.getUTCDate(),
      weekday:
        distance === 0
          ? "Hoje"
          : distance === 1
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
 *
 * Pode ser aberto por conta própria (botão do cabeçalho) ou controlado pela
 * grade da agenda, que semeia profissional, dia e horário do clique.
 */
export function ManualAppointmentSheet({
  clients,
  services,
  professionals,
  timezone,
  todayInTz,
  open: controlledOpen,
  onOpenChange,
  seed,
  showTrigger = true,
}: {
  clients: ClientOption[];
  services: ServiceOption[];
  professionals: ProfessionalOption[];
  timezone: string;
  todayInTz: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  seed?: ManualAppointmentSeed | null;
  showTrigger?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

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
  // Horário clicado na grade: só pode ser marcado depois que a RPC de
  // disponibilidade confirmar que ele está mesmo livre para o serviço.
  const [wantedStart, setWantedStart] = useState<string | null>(null);

  const seedKey = seed
    ? `${seed.professionalId ?? ""}|${seed.date ?? ""}|${seed.startsAt ?? ""}`
    : "";
  const [appliedSeed, setAppliedSeed] = useState("");

  // Ajuste de estado durante a renderização (padrão da doc do React para
  // "prop mudou"): um clique novo na grade zera a escolha e semeia
  // profissional, dia e horário. Em efeito, isso viraria render em cascata.
  if (seed && seedKey !== appliedSeed) {
    setAppliedSeed(seedKey);
    setServiceId("");
    setSlots([]);
    setSlot("");
    setSlotsError("");
    setProfessionalId(seed.professionalId ?? "");
    setDate(seed.date ?? "");
    setWantedStart(seed.startsAt ?? null);
  }

  const days = useMemo(
    () =>
      buildDayOptions(date && date > todayInTz ? date : todayInTz, todayInTz),
    [date, todayInTz],
  );

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
    setWantedStart(null);
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
    if ("error" in result) {
      setSlotsError(result.error);
    } else {
      setSlots(result.slots);
      // O horário clicado na grade é um ISO do navegador; o da RPC vem com
      // o offset do Postgres. Comparar texto erraria — comparamos o
      // instante e guardamos o valor canônico da RPC.
      if (wantedStart) {
        const wantedMs = Date.parse(wantedStart);
        const match = result.slots.find(
          (item) => Date.parse(item.starts_at) === wantedMs,
        );
        if (match) setSlot(match.starts_at);
        setWantedStart(null);
      }
    }
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
      {showTrigger ? (
        <SheetTrigger asChild>
          <Button>
            <CalendarPlus /> Novo agendamento
          </Button>
        </SheetTrigger>
      ) : null}
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
                  placeholder="Busque por nome ou WhatsApp"
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
                const nextService = event.target.value;
                setServiceId(nextService);
                // Mantém o profissional semeado pelo clique na grade quando
                // ele executa o serviço escolhido.
                const keepsProfessional = professionals.some(
                  (item) =>
                    item.id === professionalId &&
                    item.serviceIds.includes(nextService),
                );
                const nextProfessional = keepsProfessional
                  ? professionalId
                  : "";
                setProfessionalId(nextProfessional);
                setSlot("");
                setSlots([]);
                setSlotsError("");
                if (nextService && nextProfessional && date) {
                  void fetchSlots(nextService, nextProfessional, date);
                }
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
                  const next = event.target.value;
                  setProfessionalId(next);
                  setSlot("");
                  setSlots([]);
                  setSlotsError("");
                  if (serviceId && next && date) {
                    void fetchSlots(serviceId, next, date);
                  }
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
              Salvar agendamento
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
