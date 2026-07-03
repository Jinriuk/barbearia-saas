import Link from "next/link";
import { requireTenant } from "@/lib/auth/dal";
import { getUtcDayRange } from "@/lib/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { AppointmentStatusBadge } from "@/components/dashboard/appointment-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ prof?: string }>;
}) {
  const { prof } = await searchParams;
  const tenant = await requireTenant();
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
        description="Intervalos e status dos próximos atendimentos."
        action={
          <Button asChild>
            <Link href={`/${tenant.slug}/agendar`} target="_blank">
              Novo agendamento
            </Link>
          </Button>
        }
      />
      {professionals.length ? (
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
                const startsAt = new Date(item.starts_at);
                return (
                  <div
                    key={item.id}
                    className="grid items-center gap-3 rounded-xl border p-4 sm:grid-cols-[90px_1fr_1fr_auto]"
                  >
                    <div>
                      <p className="font-mono text-sm font-semibold">
                        {new Intl.DateTimeFormat("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(startsAt)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {new Intl.DateTimeFormat("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        }).format(startsAt)}
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
                    <AppointmentStatusBadge status={item.status} />
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
