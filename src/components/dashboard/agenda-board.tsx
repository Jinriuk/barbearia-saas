"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";
import { getMinutesInTz, zonedDateTimeToUtc } from "@/lib/dates";
import { formatBRL } from "@/lib/financial";
import { cn } from "@/lib/utils";
import {
  APPOINTMENT_STRIPE,
  appointmentStatusLabel,
} from "@/components/dashboard/appointment-status-badge";
import {
  AppointmentDetailSheet,
  type AgendaAppointment,
} from "@/components/dashboard/appointment-detail-sheet";
import {
  ManualAppointmentSheet,
  type ManualAppointmentSeed,
} from "@/components/dashboard/manual-appointment-sheet";

export type AgendaColumn = {
  key: string;
  label: string;
  sublabel?: string;
  professionalId?: string;
  dateKey: string;
  isToday: boolean;
  /** Expediente do dia, em minutos — fora dele a coluna fica apagada. */
  work: Array<{ startMinute: number; endMinute: number }>;
};

export type AgendaBlock = {
  id: string;
  columnKey: string;
  startMinute: number;
  endMinute: number;
  reason: string | null;
};

type ClientOption = { id: string; name: string; phone: string | null };
type ServiceOption = { id: string; name: string; durationMinutes: number };
type ProfessionalOption = { id: string; name: string; serviceIds: string[] };

/** 30 minutos por faixa; 48px dá alvo de toque confortável no celular. */
const ROW_MINUTES = 30;
const ROW_HEIGHT = 48;
const PX_PER_MIN = ROW_HEIGHT / ROW_MINUTES;
const MIN_CARD_HEIGHT = 34;

function minuteLabel(minute: number) {
  const hour = Math.floor(minute / 60);
  const rest = minute % 60;
  return `${String(hour).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/** Complemento das faixas de expediente dentro da janela desenhada. */
function offHours(
  work: Array<{ startMinute: number; endMinute: number }>,
  windowStart: number,
  windowEnd: number,
) {
  if (!work.length) return [{ startMinute: windowStart, endMinute: windowEnd }];
  const sorted = [...work].sort((a, b) => a.startMinute - b.startMinute);
  const gaps: Array<{ startMinute: number; endMinute: number }> = [];
  let cursor = windowStart;
  for (const range of sorted) {
    if (range.startMinute > cursor) {
      gaps.push({ startMinute: cursor, endMinute: range.startMinute });
    }
    cursor = Math.max(cursor, range.endMinute);
  }
  if (cursor < windowEnd)
    gaps.push({ startMinute: cursor, endMinute: windowEnd });
  return gaps;
}

/**
 * A agenda como calendário (§7.2): horário no eixo da esquerda, colunas de
 * profissional (visão Dia) ou de dia (visão Semana), cartão posicionado no
 * tempo, bloqueio hachurado e clique no vazio abrindo o cadastro já
 * preenchido com profissional, dia e hora.
 */
export function AgendaBoard({
  columns,
  appointments,
  blocks,
  windowStart,
  windowEnd,
  timezone,
  todayInTz,
  canManage,
  canCreate,
  clients,
  services,
  professionals,
  whatsappByAppointment,
}: {
  columns: AgendaColumn[];
  appointments: AgendaAppointment[];
  blocks: AgendaBlock[];
  windowStart: number;
  windowEnd: number;
  timezone: string;
  todayInTz: string;
  canManage: boolean;
  canCreate: boolean;
  clients: ClientOption[];
  services: ServiceOption[];
  professionals: ProfessionalOption[];
  whatsappByAppointment: Record<string, string>;
}) {
  const [selected, setSelected] = useState<AgendaAppointment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [seed, setSeed] = useState<ManualAppointmentSeed | null>(null);
  const [nowMinute, setNowMinute] = useState<number | null>(null);

  // O relógio só entra depois da hidratação — o servidor não pode desenhar
  // uma linha de "agora" que já nasce velha.
  useEffect(() => {
    const tick = () => setNowMinute(getMinutesInTz(new Date(), timezone));
    const initial = setTimeout(tick, 0);
    const timer = setInterval(tick, 60_000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [timezone]);

  const totalMinutes = Math.max(windowEnd - windowStart, ROW_MINUTES);
  const boardHeight = totalMinutes * PX_PER_MIN;

  const hourMarks = useMemo(() => {
    const marks: number[] = [];
    const first = Math.ceil(windowStart / 60) * 60;
    for (let minute = first; minute <= windowEnd; minute += 60) {
      marks.push(minute);
    }
    return marks;
  }, [windowStart, windowEnd]);

  const slotStarts = useMemo(() => {
    const starts: number[] = [];
    for (let minute = windowStart; minute < windowEnd; minute += ROW_MINUTES) {
      starts.push(minute);
    }
    return starts;
  }, [windowStart, windowEnd]);

  const byColumn = useMemo(() => {
    const map = new Map<string, AgendaAppointment[]>();
    for (const column of columns) map.set(column.key, []);
    for (const appointment of appointments) {
      const list = map.get(appointmentColumnKey(appointment, columns));
      if (list) list.push(appointment);
    }
    return map;
  }, [appointments, columns]);

  const blocksByColumn = useMemo(() => {
    const map = new Map<string, AgendaBlock[]>();
    for (const column of columns) map.set(column.key, []);
    for (const block of blocks) {
      const list = map.get(block.columnKey);
      if (list) list.push(block);
    }
    return map;
  }, [blocks, columns]);

  function openCreate(column: AgendaColumn, minute: number) {
    if (!canCreate) return;
    setSeed({
      professionalId: column.professionalId,
      date: column.dateKey,
      startsAt: zonedDateTimeToUtc(
        column.dateKey,
        minuteLabel(minute),
        timezone,
      ).toISOString(),
    });
    setCreateOpen(true);
  }

  return (
    <>
      {canCreate ? (
        <div className="mb-3 flex justify-end">
          <ManualAppointmentSheet
            clients={clients}
            services={services}
            professionals={professionals}
            timezone={timezone}
            todayInTz={todayInTz}
            open={createOpen}
            onOpenChange={(next) => {
              setCreateOpen(next);
              if (!next) setSeed(null);
            }}
            seed={seed}
            showTrigger={false}
          />
          <button
            type="button"
            onClick={() => {
              setSeed(null);
              setCreateOpen(true);
            }}
            className="bg-primary text-primary-foreground inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium shadow-sm transition-opacity hover:opacity-90"
          >
            <CalendarPlus className="size-4" /> Novo agendamento
          </button>
        </div>
      ) : null}

      <div className="bg-card overflow-hidden rounded-xl border">
        <div className="overflow-x-auto">
          <div className="min-w-[34rem]">
            {/* Cabeçalho das colunas */}
            <div className="bg-muted/40 flex border-b">
              <div className="w-14 shrink-0" />
              {columns.map((column) => (
                <div
                  key={column.key}
                  className={cn(
                    "min-w-[8.5rem] flex-1 border-l px-2 py-2 text-center",
                    column.isToday && "bg-primary/5",
                  )}
                >
                  <p className="truncate text-sm font-semibold">
                    {column.label}
                  </p>
                  {column.sublabel ? (
                    <p className="text-muted-foreground truncate text-xs">
                      {column.sublabel}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Corpo da grade */}
            <div className="flex" style={{ height: boardHeight }}>
              {/* Eixo de horários */}
              <div className="relative w-14 shrink-0">
                {hourMarks.map((minute) => (
                  <span
                    key={minute}
                    className="text-muted-foreground absolute right-2 -translate-y-1/2 font-mono text-[11px]"
                    style={{ top: (minute - windowStart) * PX_PER_MIN }}
                  >
                    {minuteLabel(minute)}
                  </span>
                ))}
              </div>

              {columns.map((column) => {
                const items = byColumn.get(column.key) ?? [];
                const columnBlocks = blocksByColumn.get(column.key) ?? [];
                return (
                  <div
                    key={column.key}
                    className={cn(
                      "relative min-w-[8.5rem] flex-1 border-l",
                      column.isToday && "bg-primary/[0.03]",
                    )}
                  >
                    {/* Fora do expediente */}
                    {offHours(column.work, windowStart, windowEnd).map(
                      (gap) => (
                        <div
                          key={`${column.key}-off-${gap.startMinute}`}
                          className="bg-muted/50 absolute inset-x-0"
                          style={{
                            top: (gap.startMinute - windowStart) * PX_PER_MIN,
                            height:
                              (gap.endMinute - gap.startMinute) * PX_PER_MIN,
                          }}
                        />
                      ),
                    )}

                    {/* Linhas de hora e de meia hora */}
                    {slotStarts.map((minute) => (
                      <div
                        key={`${column.key}-line-${minute}`}
                        className={cn(
                          "absolute inset-x-0 border-t",
                          minute % 60 === 0
                            ? "border-border"
                            : "border-border/40",
                        )}
                        style={{ top: (minute - windowStart) * PX_PER_MIN }}
                      />
                    ))}

                    {/* Clique no vazio abre o cadastro preenchido (§7.2.4) */}
                    {canCreate
                      ? slotStarts.map((minute) => (
                          <button
                            key={`${column.key}-slot-${minute}`}
                            type="button"
                            onClick={() => openCreate(column, minute)}
                            aria-label={`Agendar ${minuteLabel(minute)} — ${column.label}`}
                            title={`Agendar às ${minuteLabel(minute)}`}
                            className="group absolute inset-x-0 flex items-center justify-center focus-visible:outline-none"
                            style={{
                              top: (minute - windowStart) * PX_PER_MIN,
                              height: ROW_HEIGHT,
                            }}
                          >
                            <Plus className="text-muted-foreground/70 size-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                          </button>
                        ))
                      : null}

                    {/* Bloqueios, almoço e folga */}
                    {columnBlocks.map((block) => (
                      <div
                        key={block.id}
                        className="border-muted-foreground/30 text-muted-foreground absolute inset-x-1 overflow-hidden rounded-md border px-1.5 py-1 text-[11px]"
                        style={{
                          top: (block.startMinute - windowStart) * PX_PER_MIN,
                          height: Math.max(
                            (block.endMinute - block.startMinute) * PX_PER_MIN,
                            22,
                          ),
                          backgroundImage:
                            "repeating-linear-gradient(45deg, color-mix(in oklab, currentColor 12%, transparent) 0 6px, transparent 6px 12px)",
                        }}
                      >
                        {block.reason || "Bloqueado"}
                      </div>
                    ))}

                    {/* Atendimentos */}
                    {items.map((item) => {
                      const top = (item.startMinute - windowStart) * PX_PER_MIN;
                      const height = Math.max(
                        (item.endMinute - item.startMinute) * PX_PER_MIN - 2,
                        MIN_CARD_HEIGHT,
                      );
                      const compact = height < 52;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelected(item);
                            setDetailOpen(true);
                          }}
                          className={cn(
                            "absolute inset-x-1 overflow-hidden rounded-md border border-l-4 px-2 py-1 text-left shadow-sm transition-shadow hover:shadow-md",
                            "bg-card",
                            APPOINTMENT_STRIPE[item.status] ??
                              "border-l-muted-foreground",
                            item.status === "canceled" && "opacity-60",
                          )}
                          style={{ top, height }}
                        >
                          <p className="truncate text-xs font-semibold">
                            <span className="font-mono">
                              {minuteLabel(item.startMinute)}
                            </span>{" "}
                            {item.clientName}
                          </p>
                          {!compact ? (
                            <p className="text-muted-foreground truncate text-[11px]">
                              {item.serviceName}
                            </p>
                          ) : null}
                          {!compact && item.status === "completed" ? (
                            <p className="truncate font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                              {formatBRL(item.price)}
                            </p>
                          ) : null}
                          {!compact && item.status !== "completed" ? (
                            <p className="text-muted-foreground truncate text-[11px]">
                              {appointmentStatusLabel(item.status)}
                            </p>
                          ) : null}
                        </button>
                      );
                    })}

                    {/* Agora */}
                    {column.isToday &&
                    nowMinute !== null &&
                    nowMinute >= windowStart &&
                    nowMinute <= windowEnd ? (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-rose-500"
                        style={{
                          top: (nowMinute - windowStart) * PX_PER_MIN,
                        }}
                      >
                        <span className="absolute -top-1 -left-0.5 size-2 rounded-full bg-rose-500" />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <AppointmentDetailSheet
        appointment={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        timezone={timezone}
        todayInTz={todayInTz}
        canManage={canManage}
        whatsappHref={selected ? whatsappByAppointment[selected.id] : null}
      />
    </>
  );
}

/**
 * A qual coluna o atendimento pertence: na visão Dia as colunas são
 * profissionais; na visão Semana, dias.
 */
function appointmentColumnKey(
  appointment: AgendaAppointment,
  columns: AgendaColumn[],
) {
  const byProfessional = columns.find(
    (column) =>
      column.professionalId === appointment.professionalId &&
      column.dateKey === appointment.dateKey,
  );
  if (byProfessional) return byProfessional.key;
  const byDate = columns.find(
    (column) =>
      !column.professionalId && column.dateKey === appointment.dateKey,
  );
  return byDate?.key ?? "";
}
