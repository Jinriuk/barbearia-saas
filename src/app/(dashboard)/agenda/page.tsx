import Link from "next/link";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Search,
  ShoppingBag,
} from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import {
  formatDateKey,
  formatShortDateInTz,
  formatTimeInTz,
  getDateInTz,
  getMinutesInTz,
  getUtcDayRange,
  getUtcNextDayRange,
  shiftDateKey,
  startOfWeekKey,
  weekdayOfDateKey,
  zonedDateTimeToUtc,
} from "@/lib/dates";
import { can } from "@/lib/permissions";
import { formatBRL } from "@/lib/financial";
import { reminderMessage, reminderWhatsAppHref } from "@/lib/whatsapp";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { AppointmentActions } from "@/components/dashboard/appointment-actions";
import { AppointmentStatusBadge } from "@/components/dashboard/appointment-status-badge";
import {
  AgendaBoard,
  type AgendaBlock,
  type AgendaColumn,
} from "@/components/dashboard/agenda-board";
import type { AgendaAppointment } from "@/components/dashboard/appointment-detail-sheet";
import { RescheduleSheet } from "@/components/dashboard/reschedule-sheet";
import { ReservationActions } from "@/components/dashboard/reservation-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "confirmed", label: "Confirmados" },
  { value: "in_progress", label: "Em atendimento" },
  { value: "completed", label: "Concluídos" },
  { value: "canceled", label: "Cancelados" },
  { value: "no_show", label: "Faltas" },
];

const VIEWS = ["dia", "semana", "mes", "lista"] as const;
type View = (typeof VIEWS)[number];
const VIEW_LABELS: Record<View, string> = {
  dia: "Dia",
  semana: "Semana",
  mes: "Mês",
  lista: "Lista",
};

const DEFAULT_WINDOW = { start: 8 * 60, end: 20 * 60 };

/** Junta faixas de expediente que se sobrepõem (vários turnos no mesmo dia). */
function mergeRanges(
  ranges: Array<{ startMinute: number; endMinute: number }>,
) {
  const sorted = [...ranges].sort((a, b) => a.startMinute - b.startMinute);
  const merged: Array<{ startMinute: number; endMinute: number }> = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.startMinute <= last.endMinute) {
      last.endMinute = Math.max(last.endMinute, range.endMinute);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

/** "HH:MM:SS" do Postgres vira minuto do dia. */
function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + (minute || 0);
}

function monthShift(dateKey: string, delta: number) {
  const [year, month] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return shifted.toISOString().slice(0, 10);
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{
    prof?: string;
    status?: string;
    q?: string;
    dia?: string;
    view?: string;
  }>;
}) {
  const { prof, status, q, dia, view } = await searchParams;
  const tenant = await requireTenant();
  const canManage = can(tenant.role, "appointments:manage");
  // O profissional vê apenas a própria agenda (a RLS já garante isso), então
  // o filtro por profissional só faz sentido para quem enxerga a equipe toda.
  const canSeeAllAgendas =
    tenant.role === "owner" ||
    tenant.role === "manager" ||
    tenant.role === "receptionist";
  const canReadFinance = tenant.role === "owner" || tenant.role === "manager";
  const supabase = await createSupabaseServerClient();

  const todayInTz = getDateInTz(tenant.timezone);
  const { start: todayStart } = getUtcDayRange(tenant.timezone);
  // Fim de amanhã no fuso do tenant: janela dos lembretes de WhatsApp.
  const { end: tomorrowEnd } = getUtcNextDayRange(tenant.timezone);

  const activeView: View = VIEWS.includes(view as View)
    ? (view as View)
    : "dia";
  const validDay = dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : todayInTz;
  const statusFilter = STATUS_FILTERS.some((item) => item.value === status)
    ? (status ?? "")
    : "";
  const search = (q ?? "").trim().slice(0, 60);

  // Janela de datas de cada visão, no fuso do negócio.
  const midnight = (key: string) =>
    zonedDateTimeToUtc(key, "00:00", tenant.timezone);
  const weekStartKey = startOfWeekKey(validDay);
  const monthStartKey = `${validDay.slice(0, 7)}-01`;
  const rangeStartKey =
    activeView === "semana"
      ? weekStartKey
      : activeView === "mes"
        ? monthStartKey
        : validDay;
  const rangeEndKey =
    activeView === "semana"
      ? shiftDateKey(weekStartKey, 7)
      : activeView === "mes"
        ? monthShift(monthStartKey, 1)
        : shiftDateKey(validDay, 1);
  const rangeStart =
    activeView === "lista" ? todayStart : midnight(rangeStartKey);
  const rangeEnd = activeView === "lista" ? null : midnight(rangeEndKey);

  const { data: professionalData } = await supabase
    .from("professionals")
    .select("id,name,avatar_url,profile_id,public_visible")
    .eq("barbershop_id", tenant.id)
    .eq("active", true)
    .order("name");
  const allProfessionals = professionalData ?? [];
  // O barbeiro só enxerga a própria coluna — a RLS já corta os atendimentos,
  // e uma coluna vazia por colega seria ruído puro na grade.
  const visibleProfessionals = canSeeAllAgendas
    ? allProfessionals
    : allProfessionals.filter((item) => item.profile_id === tenant.profileId);
  const activeProfessional = visibleProfessionals.find(
    (item) => item.id === prof,
  );

  // Insumos do lançamento manual (mesmo catálogo visível no site público,
  // porque os horários livres vêm da mesma RPC da página de agendamento).
  const [{ data: serviceData }, { data: linkData }, { data: clientData }] =
    canSeeAllAgendas
      ? await Promise.all([
          supabase
            .from("services")
            .select("id,name,duration_minutes")
            .eq("barbershop_id", tenant.id)
            .eq("active", true)
            .order("name"),
          supabase
            .from("professional_services")
            .select("professional_id,service_id")
            .eq("barbershop_id", tenant.id),
          supabase
            .from("clients")
            .select("id,name,phone")
            .eq("barbershop_id", tenant.id)
            .eq("active", true)
            .order("name")
            .limit(400),
        ])
      : [{ data: null }, { data: null }, { data: null }];
  const bookableServices = (serviceData ?? []).map((service) => ({
    id: service.id,
    name: service.name,
    durationMinutes: service.duration_minutes,
  }));
  const serviceIdsByProfessional = new Map<string, string[]>();
  for (const link of linkData ?? []) {
    const list = serviceIdsByProfessional.get(link.professional_id) ?? [];
    list.push(link.service_id);
    serviceIdsByProfessional.set(link.professional_id, list);
  }
  const bookableProfessionals = allProfessionals
    .filter((professional) => professional.public_visible)
    .map((professional) => ({
      id: professional.id,
      name: professional.name,
      serviceIds: serviceIdsByProfessional.get(professional.id) ?? [],
    }));

  // Reservas de produto pendentes — secretária/gerente/dono confirmam ou cancelam.
  const { data: reservationData } = canSeeAllAgendas
    ? await supabase
        .from("appointment_products")
        .select(
          "id,quantity,unit_price,product:products(name),appointment:appointments(client:clients(name),professional:professionals(name))",
        )
        .eq("barbershop_id", tenant.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: null };
  const reservations = reservationData ?? [];

  // ── Atendimentos da janela ────────────────────────────────────────────────
  let query = supabase
    .from("appointments")
    .select(
      "id,starts_at,ends_at,status,notes,client:clients(id,name,phone),service:services(id,name,price),professional:professionals(id,name)",
    )
    .eq("barbershop_id", tenant.id)
    .gte("starts_at", rangeStart.toISOString())
    .order("starts_at")
    .limit(activeView === "lista" ? 300 : 800);
  if (rangeEnd) query = query.lt("starts_at", rangeEnd.toISOString());
  if (statusFilter) query = query.eq("status", statusFilter);
  if (activeProfessional)
    query = query.eq("professional_id", activeProfessional.id);
  // A visão Mês só precisa da contagem por dia — agregada no banco.
  const { data: appointmentData } =
    activeView === "mes" ? { data: [] } : await query;

  const normalized = search
    ? search.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    : "";
  const rows = (appointmentData ?? []).filter((item) => {
    if (!normalized) return true;
    const name = (first(item.client)?.name ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
    const phone = first(item.client)?.phone ?? "";
    return name.includes(normalized) || phone.includes(search);
  });

  // Valor realmente lançado para os concluídos (o catálogo pode ter mudado
  // depois). Só o dono/gerente enxerga o financeiro — para os demais a
  // grade cai no preço do catálogo.
  const appointmentIds = rows.map((item) => item.id as string);
  const { data: incomeData } =
    canReadFinance && appointmentIds.length
      ? await supabase
          .from("financial_transactions")
          .select("appointment_id,amount")
          .eq("barbershop_id", tenant.id)
          .eq("type", "income")
          .eq("category", "service")
          .in("appointment_id", appointmentIds)
      : { data: null };
  const incomeByAppointment = new Map<string, number>(
    (incomeData ?? []).map((item) => [
      item.appointment_id as string,
      Number(item.amount),
    ]),
  );

  // Produtos reservados dentro do atendimento (§7.2 pede que apareçam ali,
  // não só numa fila separada).
  const { data: productData } = appointmentIds.length
    ? await supabase
        .from("appointment_products")
        .select("appointment_id,quantity,unit_price")
        .eq("barbershop_id", tenant.id)
        .eq("status", "pending")
        .in("appointment_id", appointmentIds)
    : { data: null };
  const productsByAppointment = new Map<
    string,
    { count: number; total: number }
  >();
  for (const item of productData ?? []) {
    const key = item.appointment_id as string;
    const current = productsByAppointment.get(key) ?? { count: 0, total: 0 };
    current.count += Number(item.quantity);
    current.total += Number(item.quantity) * Number(item.unit_price);
    productsByAppointment.set(key, current);
  }

  const appointments: AgendaAppointment[] = rows.map((item) => {
    const client = first(item.client);
    const service = first(item.service);
    const professional = first(item.professional);
    const startMinute = getMinutesInTz(
      item.starts_at as string,
      tenant.timezone,
    );
    const rawEnd = getMinutesInTz(item.ends_at as string, tenant.timezone);
    const products = productsByAppointment.get(item.id as string);
    return {
      id: item.id as string,
      startsAt: item.starts_at as string,
      endsAt: item.ends_at as string,
      status: item.status as string,
      clientId: client?.id ?? null,
      clientName: client?.name ?? "Cliente",
      clientPhone: client?.phone ?? null,
      serviceId: service?.id ?? null,
      serviceName: service?.name ?? "Serviço",
      professionalId: professional?.id ?? "",
      professionalName: professional?.name ?? "profissional",
      price:
        incomeByAppointment.get(item.id as string) ??
        Number(service?.price ?? 0),
      notes: (item.notes as string | null) ?? null,
      productCount: products?.count ?? 0,
      productTotal: products?.total ?? 0,
      startMinute,
      // Atendimento que atravessa a meia-noite fecha no fim do dia.
      endMinute: rawEnd > startMinute ? rawEnd : 24 * 60,
      dateKey: getDateInTz(tenant.timezone, new Date(item.starts_at as string)),
    };
  });

  const whatsappByAppointment: Record<string, string> = {};
  for (const item of appointments) {
    const startsAt = new Date(item.startsAt);
    if (
      startsAt < tomorrowEnd &&
      (item.status === "pending" || item.status === "confirmed")
    ) {
      const href = reminderWhatsAppHref(
        item.clientPhone,
        reminderMessage(
          {
            clientName: item.clientName,
            serviceName: item.serviceName,
            startsAt,
          },
          tenant,
        ),
      );
      if (href) whatsappByAppointment[item.id] = href;
    }
  }

  // ── Expediente e bloqueios (só a grade precisa) ───────────────────────────
  const isBoard = activeView === "dia" || activeView === "semana";
  const boardProfessionals = activeProfessional
    ? [activeProfessional]
    : visibleProfessionals;
  const dayKeys =
    activeView === "semana"
      ? Array.from({ length: 7 }, (_, index) =>
          shiftDateKey(weekStartKey, index),
        )
      : [validDay];

  const { data: availabilityData } = isBoard
    ? await supabase
        .from("professional_availability")
        .select("professional_id,weekday,starts_at,ends_at")
        .eq("barbershop_id", tenant.id)
        .eq("active", true)
    : { data: null };
  const availability = availabilityData ?? [];

  const { data: blockData } =
    isBoard && rangeEnd
      ? await supabase
          .from("schedule_blocks")
          .select("id,professional_id,starts_at,ends_at,reason")
          .eq("barbershop_id", tenant.id)
          .lt("starts_at", rangeEnd.toISOString())
          .gt("ends_at", rangeStart.toISOString())
          .limit(200)
      : { data: null };

  const columns: AgendaColumn[] =
    activeView === "semana"
      ? dayKeys.map((dayKey) => {
          const weekday = weekdayOfDateKey(dayKey);
          const professionalIds = new Set(
            boardProfessionals.map((item) => item.id),
          );
          return {
            key: `d:${dayKey}`,
            label: formatDateKey(dayKey, { weekday: "short" }).replace(".", ""),
            sublabel: formatDateKey(dayKey, {
              day: "2-digit",
              month: "2-digit",
            }),
            professionalId: activeProfessional?.id,
            dateKey: dayKey,
            isToday: dayKey === todayInTz,
            work: mergeRanges(
              availability
                .filter(
                  (rule) =>
                    rule.weekday === weekday &&
                    professionalIds.has(rule.professional_id),
                )
                .map((rule) => ({
                  startMinute: timeToMinutes(rule.starts_at),
                  endMinute: timeToMinutes(rule.ends_at),
                })),
            ),
          };
        })
      : boardProfessionals.map((professional) => {
          const weekday = weekdayOfDateKey(validDay);
          return {
            key: `p:${professional.id}`,
            label: professional.name,
            professionalId: professional.id,
            dateKey: validDay,
            isToday: validDay === todayInTz,
            work: mergeRanges(
              availability
                .filter(
                  (rule) =>
                    rule.professional_id === professional.id &&
                    rule.weekday === weekday,
                )
                .map((rule) => ({
                  startMinute: timeToMinutes(rule.starts_at),
                  endMinute: timeToMinutes(rule.ends_at),
                })),
            ),
          };
        });

  // Bloqueios recortados por dia: uma folga de três dias vira um retângulo
  // em cada coluna que ela atravessa.
  const blocks: AgendaBlock[] = [];
  for (const block of blockData ?? []) {
    for (const column of columns) {
      if (
        column.professionalId &&
        column.professionalId !== block.professional_id
      ) {
        continue;
      }
      // Na visão Semana sem profissional escolhido, misturar as folgas de
      // todo mundo numa coluna só enganaria mais do que informaria.
      if (
        !column.professionalId &&
        activeView === "semana" &&
        !activeProfessional
      ) {
        continue;
      }
      const dayStart = midnight(column.dateKey).getTime();
      const dayEnd = midnight(shiftDateKey(column.dateKey, 1)).getTime();
      const blockStart = Date.parse(block.starts_at as string);
      const blockEnd = Date.parse(block.ends_at as string);
      if (blockEnd <= dayStart || blockStart >= dayEnd) continue;
      const startMinute =
        blockStart <= dayStart
          ? 0
          : getMinutesInTz(new Date(blockStart), tenant.timezone);
      const endMinute =
        blockEnd >= dayEnd
          ? 24 * 60
          : getMinutesInTz(new Date(blockEnd), tenant.timezone);
      blocks.push({
        id: `${block.id}-${column.key}`,
        columnKey: column.key,
        startMinute,
        endMinute: endMinute > startMinute ? endMinute : 24 * 60,
        reason: (block.reason as string | null) ?? null,
      });
    }
  }

  // Janela desenhada: expediente do dia, esticada pelo que estiver fora dele.
  let windowStart = DEFAULT_WINDOW.start;
  let windowEnd = DEFAULT_WINDOW.end;
  const workRanges = columns.flatMap((column) => column.work);
  if (workRanges.length) {
    windowStart = Math.min(...workRanges.map((range) => range.startMinute));
    windowEnd = Math.max(...workRanges.map((range) => range.endMinute));
  }
  for (const item of appointments) {
    windowStart = Math.min(windowStart, item.startMinute);
    windowEnd = Math.max(windowEnd, item.endMinute);
  }
  for (const block of blocks) {
    windowStart = Math.min(windowStart, block.startMinute);
    windowEnd = Math.max(windowEnd, block.endMinute);
  }
  windowStart = Math.max(0, Math.floor(windowStart / 60) * 60);
  windowEnd = Math.min(24 * 60, Math.ceil(windowEnd / 60) * 60);
  if (windowEnd - windowStart < 120)
    windowEnd = Math.min(24 * 60, windowStart + 120);

  // ── Visão Mês ─────────────────────────────────────────────────────────────
  const { data: monthData } =
    activeView === "mes" && rangeEnd
      ? await supabase.rpc("get_agenda_month", {
          p_barbershop: tenant.id,
          p_from: rangeStart.toISOString(),
          p_to: rangeEnd.toISOString(),
          p_professional: activeProfessional?.id ?? null,
        })
      : { data: null };
  const monthByDay = new Map<
    string,
    { scheduled: number; completed: number; canceled: number }
  >(
    (
      (monthData ?? []) as Array<{
        day: string;
        scheduled: number;
        completed: number;
        canceled: number;
      }>
    ).map((row) => [
      row.day,
      {
        scheduled: Number(row.scheduled),
        completed: Number(row.completed),
        canceled: Number(row.canceled),
      },
    ]),
  );
  const monthCells = (() => {
    if (activeView !== "mes") return [];
    const gridStart = startOfWeekKey(monthStartKey);
    const cells: Array<{ key: string; inMonth: boolean }> = [];
    for (let index = 0; index < 42; index += 1) {
      const key = shiftDateKey(gridStart, index);
      cells.push({
        key,
        inMonth: key.slice(0, 7) === monthStartKey.slice(0, 7),
      });
      if (index >= 34 && key >= rangeEndKey) break;
    }
    return cells;
  })();

  // ── Navegação e links ─────────────────────────────────────────────────────
  const buildQuery = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      prof,
      status: statusFilter || undefined,
      q: search || undefined,
      dia: validDay,
      view: activeView,
      ...patch,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/agenda?${qs}` : "/agenda";
  };
  const stepDay = (delta: number) =>
    activeView === "semana"
      ? shiftDateKey(validDay, delta * 7)
      : activeView === "mes"
        ? monthShift(validDay, delta)
        : shiftDateKey(validDay, delta);

  const headerDate =
    activeView === "mes"
      ? formatDateKey(monthStartKey, { month: "long", year: "numeric" })
      : activeView === "semana"
        ? `${formatDateKey(weekStartKey, { day: "2-digit", month: "short" })} – ${formatDateKey(shiftDateKey(weekStartKey, 6), { day: "2-digit", month: "short" })}`
        : formatDateKey(validDay, {
            weekday: "long",
            day: "2-digit",
            month: "long",
          });

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Agenda"
        description={
          activeView === "lista"
            ? "Próximos horários, do mais perto ao mais distante."
            : headerDate.charAt(0).toUpperCase() + headerDate.slice(1)
        }
        action={
          canSeeAllAgendas ? undefined : (
            <Button asChild>
              <Link href={`/${tenant.slug}/agendar`} target="_blank">
                <CalendarPlus /> Novo agendamento
              </Link>
            </Button>
          )
        }
      />

      {/* Visão, navegação e busca */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border p-0.5">
          {VIEWS.map((item) => (
            <Button
              key={item}
              asChild
              size="sm"
              variant={activeView === item ? "default" : "ghost"}
            >
              <Link href={buildQuery({ view: item })}>{VIEW_LABELS[item]}</Link>
            </Button>
          ))}
        </div>

        {activeView !== "lista" ? (
          <div className="flex items-center gap-1">
            <Button asChild size="icon-sm" variant="outline">
              <Link
                href={buildQuery({ dia: stepDay(-1) })}
                aria-label="Período anterior"
              >
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={buildQuery({ dia: todayInTz })}>Hoje</Link>
            </Button>
            <Button asChild size="icon-sm" variant="outline">
              <Link
                href={buildQuery({ dia: stepDay(1) })}
                aria-label="Próximo período"
              >
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        ) : null}

        <form action="/agenda" className="flex items-center gap-2">
          {prof ? <input type="hidden" name="prof" value={prof} /> : null}
          {statusFilter ? (
            <input type="hidden" name="status" value={statusFilter} />
          ) : null}
          <input type="hidden" name="view" value={activeView} />
          <input
            type="date"
            name="dia"
            defaultValue={validDay}
            aria-label="Escolher dia"
            className="border-border-control bg-field focus-visible:border-focus-ring focus-visible:ring-focus-ring/45 h-12 rounded-lg border px-3 text-sm transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:h-11"
          />
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Buscar cliente…"
            aria-label="Buscar cliente por nome ou WhatsApp"
            className="border-border-control bg-field focus-visible:border-focus-ring focus-visible:ring-focus-ring/45 h-12 w-40 rounded-lg border px-3 text-sm transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 sm:w-56 md:h-11"
          />
          <Button size="sm" variant="outline" type="submit">
            <Search className="size-3.5" />
            <span className="sr-only sm:not-sr-only">Filtrar</span>
          </Button>
        </form>
      </div>

      {/* Situação */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((item) => (
          <Button
            key={item.value || "all"}
            asChild
            size="sm"
            variant={statusFilter === item.value ? "default" : "outline"}
          >
            <Link href={buildQuery({ status: item.value || undefined })}>
              {item.label}
            </Link>
          </Button>
        ))}
      </div>

      {/* Profissionais, com foto (§7.2.3) */}
      {canSeeAllAgendas && visibleProfessionals.length ? (
        <div className="mb-5 flex flex-wrap gap-2">
          <Button
            asChild
            size="sm"
            variant={activeProfessional ? "outline" : "default"}
          >
            <Link href={buildQuery({ prof: undefined })}>Todos</Link>
          </Button>
          {visibleProfessionals.map((professional) => (
            <Button
              key={professional.id}
              asChild
              size="sm"
              variant={
                activeProfessional?.id === professional.id
                  ? "default"
                  : "outline"
              }
            >
              <Link href={buildQuery({ prof: professional.id })}>
                <Avatar size="sm">
                  {professional.avatar_url ? (
                    <AvatarImage
                      src={professional.avatar_url}
                      alt={professional.name}
                    />
                  ) : null}
                  <AvatarFallback>
                    {professional.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {professional.name}
              </Link>
            </Button>
          ))}
        </div>
      ) : null}

      {reservations.length ? (
        <Card className="border-warning/50 mb-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="size-4" /> Vendas de produto a confirmar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reservations.map((reservation) => {
              const appt = first(reservation.appointment);
              const clientName = first(appt?.client)?.name ?? "Cliente";
              const professionalName = first(appt?.professional)?.name ?? "—";
              const total =
                Number(reservation.quantity) * Number(reservation.unit_price);
              return (
                <div
                  key={reservation.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {first(reservation.product)?.name ?? "Produto"} ×{" "}
                      {reservation.quantity}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {clientName} · {professionalName} · {formatBRL(total)}
                    </p>
                  </div>
                  <ReservationActions id={reservation.id} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {isBoard ? (
        columns.length ? (
          <AgendaBoard
            columns={columns}
            appointments={appointments}
            blocks={blocks}
            windowStart={windowStart}
            windowEnd={windowEnd}
            timezone={tenant.timezone}
            todayInTz={todayInTz}
            canManage={canManage}
            canCreate={canSeeAllAgendas}
            clients={clientData ?? []}
            services={bookableServices}
            professionals={bookableProfessionals}
            whatsappByAppointment={whatsappByAppointment}
          />
        ) : (
          <EmptyState
            title="Nenhum profissional ativo"
            description="Cadastre a equipe para a agenda ganhar colunas."
          />
        )
      ) : null}

      {activeView === "mes" ? (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-7 gap-1 text-center">
              {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((day) => (
                <p
                  key={day}
                  className="text-muted-foreground pb-1 text-xs font-semibold uppercase"
                >
                  {day}
                </p>
              ))}
              {monthCells.map((cell) => {
                const counts = monthByDay.get(cell.key);
                return (
                  <Link
                    key={cell.key}
                    href={buildQuery({ view: "dia", dia: cell.key })}
                    className={`hover:border-primary/60 flex min-h-16 flex-col items-center justify-start gap-1 rounded-lg border p-1.5 transition-colors ${
                      cell.inMonth ? "" : "opacity-40"
                    } ${cell.key === todayInTz ? "border-primary" : ""}`}
                  >
                    <span className="font-mono text-sm">
                      {Number(cell.key.slice(8, 10))}
                    </span>
                    {counts?.scheduled ? (
                      <span className="bg-primary/15 text-primary rounded px-1.5 text-[11px] font-semibold">
                        {counts.scheduled}
                      </span>
                    ) : null}
                    {counts?.completed ? (
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                        {counts.completed} ok
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeView === "lista" ? (
        <Card>
          <CardContent className="pt-6">
            {appointments.length ? (
              <div className="space-y-3">
                {appointments.map((item) => {
                  const reminderHref = whatsappByAppointment[item.id];
                  return (
                    <div
                      key={item.id}
                      className="grid items-center gap-3 rounded-xl border p-4 sm:grid-cols-[90px_1fr_1fr_auto]"
                    >
                      <div>
                        <p className="font-mono text-sm font-semibold">
                          {formatTimeInTz(item.startsAt, tenant.timezone)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatShortDateInTz(item.startsAt, tenant.timezone)}
                        </p>
                      </div>
                      <div>
                        {item.clientId ? (
                          <Link
                            href={`/clientes/${item.clientId}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {item.clientName}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium">
                            {item.clientName}
                          </p>
                        )}
                        <p className="text-muted-foreground text-xs">
                          {item.clientPhone}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm">{item.serviceName}</p>
                        <p className="text-muted-foreground text-xs">
                          com {item.professionalName}
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <AppointmentStatusBadge status={item.status} />
                        {reminderHref ? (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="text-emerald-700 dark:text-emerald-400"
                          >
                            <a
                              href={reminderHref}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <MessageCircle className="size-3.5" />
                              Lembrar no WhatsApp
                            </a>
                          </Button>
                        ) : null}
                        {canManage ? (
                          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                            <AppointmentActions
                              appointmentId={item.id}
                              status={item.status}
                              startsAt={item.startsAt}
                            />
                            {(item.status === "pending" ||
                              item.status === "confirmed") &&
                            item.serviceId ? (
                              <RescheduleSheet
                                appointmentId={item.id}
                                serviceId={item.serviceId}
                                professionalId={item.professionalId}
                                todayInTz={todayInTz}
                                timezone={tenant.timezone}
                              />
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title={
                  search
                    ? `Nada encontrado para "${search}"`
                    : activeProfessional
                      ? `Sem horários para ${activeProfessional.name}`
                      : "Agenda livre"
                }
                description="Ajuste os filtros ou o período para ver outros atendimentos."
              />
            )}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
