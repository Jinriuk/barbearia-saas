import {
  CalendarDays,
  CircleDollarSign,
  Contact,
  Scissors,
} from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { getUtcDayRange } from "@/lib/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const tenant = await requireTenant();
  const supabase = await createSupabaseServerClient();
  const { start: dayStart, end: dayEnd } = getUtcDayRange(tenant.timezone);

  const [appointments, clients, services] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id,starts_at,status,client:clients(name),service:services(name)",
        { count: "exact" },
      )
      .eq("barbershop_id", tenant.id)
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString())
      .order("starts_at")
      .limit(5),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("barbershop_id", tenant.id)
      .eq("active", true),
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("barbershop_id", tenant.id)
      .eq("active", true),
  ]);

  const metrics = [
    ["Agenda hoje", appointments.count ?? 0, CalendarDays],
    ["Clientes ativos", clients.count ?? 0, Contact],
    ["Serviços ativos", services.count ?? 0, Scissors],
    ["Receita prevista", "—", CircleDollarSign],
  ];

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Bom trabalho por aí."
        description="O essencial do dia, sem ruído. Valores financeiros aparecem quando o módulo for ativado."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, Icon]) => {
          const MetricIcon = Icon as typeof CalendarDays;
          return (
            <Card key={String(label)}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {String(label)}
                </CardTitle>
                <MetricIcon className="text-primary size-4" />
              </CardHeader>
              <CardContent>
                <p className="font-mono text-3xl font-semibold">
                  {String(value)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Próximos atendimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(appointments.data ?? []).length ? (
            (appointments.data ?? []).map((appointment) => {
              const client = Array.isArray(appointment.client)
                ? appointment.client[0]
                : appointment.client;
              const service = Array.isArray(appointment.service)
                ? appointment.service[0]
                : appointment.service;
              return (
                <div
                  key={appointment.id}
                  className="flex items-center gap-4 rounded-lg border p-4"
                >
                  <span className="font-mono text-sm font-medium">
                    {new Intl.DateTimeFormat("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(appointment.starts_at))}
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {client?.name ?? "Cliente"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {service?.name ?? "Serviço"}
                    </p>
                  </div>
                  <Badge className="ml-auto" variant="secondary">
                    {appointment.status}
                  </Badge>
                </div>
              );
            })
          ) : (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Nenhum horário para hoje.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
