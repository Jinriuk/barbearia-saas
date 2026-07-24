import Link from "next/link";
import { CalendarPlus, MessageCircle, Search, ShoppingBag } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import {
  formatShortDateInTz,
  formatTimeInTz,
  getDateInTz,
  getUtcDayRange,
  getUtcNextDayRange,
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
import { ManualAppointmentSheet } from "@/components/dashboard/manual-appointment-sheet";
import { RescheduleSheet } from "@/components/dashboard/reschedule-sheet";
import { ReservationActions } from "@/components/dashboard/reservation-actions";
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
  { value: "completed", label: "Concluídos" },
  { value: "canceled", label: "Cancelados" },
  { value: "no_show", label: "Faltas" },
];

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
  const supabase = await createSupabaseServerClient();
  const { start: todayStart } = getUtcDayRange(tenant.timezone);
  // Fim de amanhã no fuso do tenant: janela dos lembretes de WhatsApp.
  const { end: tomorrowEnd } = getUtcNextDayRange(tenant.timezone);

  // Visões (Fase 2): "próximos" (padrão), "dia" (data escolhida) e "semana"
  // (7 dias a partir da data escolhida/hoje).
  const validDay = dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : null;
  const activeView =
    view === "semana" ? "semana" : validDay ? "dia" : "proximos";
  const DAY_MS = 86_400_000;
  const rangeStart = validDay
    ? zonedDateTimeToUtc(validDay, "00:00", tenant.timezone)
    : todayStart;
  const rangeEnd =
    activeView === "semana"
      ? new Date(rangeStart.getTime() + 7 * DAY_MS)
      : activeView === "dia"
        ? new Date(rangeStart.getTime() + DAY_MS)
        : null;
  const statusFilter = STATUS_FILTERS.some((item) => item.value === status)
    ? (status ?? "")
    : "";
  const search = (q ?? "").trim().slice(0, 60);

  const { data: professionalData } = await supabase
    .from("professionals")
    .select("id,name,public_visible")
    .eq("barbershop_id", tenant.id)
    .eq("active", true)
    .order("name");
  const professionals = professionalData ?? [];
  const activeProfessional = professionals.find((item) => item.id === prof);

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
  const bookableProfessionals = professionals
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

  let query = supabase
    .from("appointments")
    .select(
      "id,starts_at,ends_at,status,client:clients(name,phone),service:services(id,name),professional:professionals(id,name)",
    )
    .eq("barbershop_id", tenant.id)
    .gte("starts_at", rangeStart.toISOString())
    .order("starts_at")
    .limit(300);
  if (rangeEnd) query = query.lt("starts_at", rangeEnd.toISOString());
  if (statusFilter) query = query.eq("status", statusFilter);
  if (activeProfessional)
    query = query.eq("professional_id", activeProfessional.id);
  const { data: appointmentData } = await query;
  const normalized = search
    ? search.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    : "";
  const data = (appointmentData ?? []).filter((item) => {
    if (!normalized) return true;
    const name = (first(item.client)?.name ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
    const phone = first(item.client)?.phone ?? "";
    return name.includes(normalized) || phone.includes(search);
  });

  // Preserva os demais filtros ao navegar.
  const buildQuery = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      prof,
      status: statusFilter || undefined,
      q: search || undefined,
      dia: validDay ?? undefined,
      view: activeView === "proximos" ? undefined : activeView,
      ...patch,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/agenda?${qs}` : "/agenda";
  };

  const todayInTz = getDateInTz(tenant.timezone);
  const dayGroups = new Map<string, typeof data>();
  for (const item of data) {
    const key = getDateInTz(tenant.timezone, new Date(item.starts_at));
    const list = dayGroups.get(key) ?? [];
    list.push(item);
    dayGroups.set(key, list);
  }

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Agenda"
        description="Confirme, conclua, remarque ou cancele os atendimentos."
        action={
          canSeeAllAgendas ? (
            <ManualAppointmentSheet
              clients={clientData ?? []}
              services={bookableServices}
              professionals={bookableProfessionals}
              timezone={tenant.timezone}
              todayInTz={todayInTz}
            />
          ) : (
            <Button asChild>
              <Link href={`/${tenant.slug}/agendar`} target="_blank">
                <CalendarPlus /> Novo agendamento
              </Link>
            </Button>
          )
        }
      />

      {/* Visão + dia + busca */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border p-0.5">
          <Button
            asChild
            size="sm"
            variant={activeView === "proximos" ? "default" : "ghost"}
          >
            <Link href={buildQuery({ dia: undefined, view: undefined })}>
              Próximos
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant={activeView === "dia" ? "default" : "ghost"}
          >
            <Link
              href={buildQuery({ dia: validDay ?? todayInTz, view: undefined })}
            >
              Dia
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant={activeView === "semana" ? "default" : "ghost"}
          >
            <Link
              href={buildQuery({ dia: validDay ?? todayInTz, view: "semana" })}
            >
              Semana
            </Link>
          </Button>
        </div>
        <form action="/agenda" className="flex items-center gap-2">
          {prof ? <input type="hidden" name="prof" value={prof} /> : null}
          {statusFilter ? (
            <input type="hidden" name="status" value={statusFilter} />
          ) : null}
          {activeView === "semana" ? (
            <input type="hidden" name="view" value="semana" />
          ) : null}
          <input
            type="date"
            name="dia"
            defaultValue={validDay ?? todayInTz}
            aria-label="Escolher dia"
            className="border-input bg-background h-9 rounded-lg border px-2 text-sm"
          />
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Buscar cliente…"
            aria-label="Buscar cliente por nome ou telefone"
            className="border-input bg-background h-9 w-40 rounded-lg border px-3 text-sm sm:w-56"
          />
          <Button size="sm" variant="outline" type="submit">
            <Search className="size-3.5" />
            <span className="sr-only sm:not-sr-only">Filtrar</span>
          </Button>
        </form>
      </div>

      {/* Status */}
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

      {canSeeAllAgendas && professionals.length ? (
        <div className="mb-5 flex flex-wrap gap-2">
          <Button
            asChild
            size="sm"
            variant={activeProfessional ? "outline" : "default"}
          >
            <Link href={buildQuery({ prof: undefined })}>Todos</Link>
          </Button>
          {professionals.map((professional) => (
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

      <Card>
        <CardContent className="pt-6">
          {data.length ? (
            <div className="space-y-3">
              {[...dayGroups.entries()].map(([dayKey, items]) => (
                <div key={dayKey} className="space-y-3">
                  {activeView === "semana" ? (
                    <p className="text-muted-foreground pt-2 text-xs font-semibold tracking-wide uppercase first:pt-0">
                      {new Intl.DateTimeFormat("pt-BR", {
                        timeZone: tenant.timezone,
                        weekday: "long",
                        day: "2-digit",
                        month: "short",
                      }).format(new Date(items[0].starts_at))}
                      {dayKey === todayInTz ? " · hoje" : ""}
                    </p>
                  ) : null}
                  {items.map((item) => {
                    const client = first(item.client);
                    const service = first(item.service);
                    const professional = first(item.professional);
                    // Lembrete de WhatsApp: só para horários de hoje e amanhã
                    // ainda de pé (pendentes/confirmados) e com telefone.
                    const startsAt = new Date(item.starts_at);
                    const reminderHref =
                      startsAt < tomorrowEnd &&
                      (item.status === "pending" || item.status === "confirmed")
                        ? reminderWhatsAppHref(
                            client?.phone,
                            reminderMessage(
                              {
                                clientName: client?.name ?? "cliente",
                                serviceName: service?.name ?? "seu atendimento",
                                startsAt,
                              },
                              tenant,
                            ),
                          )
                        : null;
                    return (
                      <div
                        key={item.id}
                        className="grid items-center gap-3 rounded-xl border p-4 sm:grid-cols-[90px_1fr_1fr_auto]"
                      >
                        <div>
                          <p className="font-mono text-sm font-semibold">
                            {formatTimeInTz(item.starts_at, tenant.timezone)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatShortDateInTz(
                              item.starts_at,
                              tenant.timezone,
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {client?.name ?? "Cliente"}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {client?.phone}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm">{service?.name}</p>
                          <p className="text-muted-foreground text-xs">
                            com {professional?.name ?? "profissional"}
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
                                startsAt={item.starts_at}
                              />
                              {(item.status === "pending" ||
                                item.status === "confirmed") &&
                              service?.id &&
                              professional?.id ? (
                                <RescheduleSheet
                                  appointmentId={item.id}
                                  serviceId={service.id}
                                  professionalId={professional.id}
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
              ))}
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
    </>
  );
}
