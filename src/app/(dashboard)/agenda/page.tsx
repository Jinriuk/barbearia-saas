import Link from "next/link";
import { CalendarPlus, ShoppingBag } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import {
  formatShortDateInTz,
  formatTimeInTz,
  getUtcDayRange,
} from "@/lib/dates";
import { can } from "@/lib/permissions";
import { formatBRL } from "@/lib/financial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { AppointmentActions } from "@/components/dashboard/appointment-actions";
import { AppointmentStatusBadge } from "@/components/dashboard/appointment-status-badge";
import { ReservationActions } from "@/components/dashboard/reservation-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ prof?: string }>;
}) {
  const { prof } = await searchParams;
  const tenant = await requireTenant();
  const canManage = can(tenant.role, "appointments:manage");
  // O profissional vê apenas a própria agenda (a RLS já garante isso), então
  // o filtro por profissional só faz sentido para quem enxerga a equipe toda.
  const canSeeAllAgendas =
    tenant.role === "owner" ||
    tenant.role === "manager" ||
    tenant.role === "receptionist";
  const supabase = await createSupabaseServerClient();
  const { start } = getUtcDayRange(tenant.timezone);

  const { data: professionalData } = await supabase
    .from("professionals")
    .select("id,name")
    .eq("barbershop_id", tenant.id)
    .eq("active", true)
    .order("name");
  const professionals = professionalData ?? [];
  const activeProfessional = professionals.find((item) => item.id === prof);

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
      "id,starts_at,ends_at,status,client:clients(name,phone),service:services(name),professional:professionals(id,name)",
    )
    .eq("barbershop_id", tenant.id)
    .gte("starts_at", start.toISOString())
    .order("starts_at")
    .limit(100);
  if (activeProfessional)
    query = query.eq("professional_id", activeProfessional.id);
  const { data: appointmentData } = await query;
  const data = appointmentData ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Agenda"
        description="Confirme, conclua ou cancele os próximos atendimentos."
        action={
          <Button asChild>
            <Link href={`/${tenant.slug}/agendar`} target="_blank">
              <CalendarPlus /> Novo agendamento
            </Link>
          </Button>
        }
      />
      {canSeeAllAgendas && professionals.length ? (
        <div className="mb-5 flex flex-wrap gap-2">
          <Button
            asChild
            size="sm"
            variant={activeProfessional ? "outline" : "default"}
          >
            <Link href="/agenda">Todos</Link>
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
              <Link href={`/agenda?prof=${professional.id}`}>
                {professional.name}
              </Link>
            </Button>
          ))}
        </div>
      ) : null}
      {reservations.length ? (
        <Card className="mb-5 border-amber-300 dark:border-amber-900">
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
              {data.map((item) => {
                const client = Array.isArray(item.client)
                  ? item.client[0]
                  : item.client;
                const service = Array.isArray(item.service)
                  ? item.service[0]
                  : item.service;
                const professional = Array.isArray(item.professional)
                  ? item.professional[0]
                  : item.professional;
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
                        {formatShortDateInTz(item.starts_at, tenant.timezone)}
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
                      {canManage ? (
                        <AppointmentActions
                          appointmentId={item.id}
                          status={item.status}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title={
                activeProfessional
                  ? `Sem horários para ${activeProfessional.name}`
                  : "Agenda livre"
              }
              description="Os próximos atendimentos aparecerão aqui."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
