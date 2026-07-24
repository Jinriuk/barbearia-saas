import Link from "next/link";
import { requireTenant } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import {
  WeeklyAvailabilityEditor,
  type WeeklyRule,
} from "@/components/dashboard/weekly-availability-editor";
import {
  ScheduleBlocksCard,
  type ScheduleBlockRow,
} from "@/components/dashboard/schedule-blocks-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Expediente, folgas e bloqueios (Fase 1 — §6.4): horários por dia da semana
 * com turnos divididos, dia fechado, folga/férias e bloqueio pontual.
 * Owner/manager editam qualquer profissional; o próprio profissional edita a
 * própria agenda (a RPC e a RLS reforçam isso no banco).
 */
export default async function TeamSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ profissional?: string }>;
}) {
  const { profissional } = await searchParams;
  const tenant = await requireTenant();

  const canManageOthers = tenant.role === "owner" || tenant.role === "manager";
  if (!canManageOthers && tenant.role !== "professional") {
    return (
      <>
        <PageHeader
          eyebrow="Equipe"
          title="Horários e folgas"
          description="Expediente semanal, folgas e bloqueios da equipe."
        />
        <EmptyState
          title="Acesso restrito"
          description="Fale com o proprietário para ajustar horários."
        />
      </>
    );
  }

  const supabase = await createSupabaseServerClient();
  let professionalsQuery = supabase
    .from("professionals")
    .select("id,name,active,profile_id")
    .eq("barbershop_id", tenant.id)
    .eq("active", true)
    .order("name");
  if (!canManageOthers) {
    professionalsQuery = professionalsQuery.eq("profile_id", tenant.profileId);
  }
  const { data: professionalData } = await professionalsQuery;
  const professionals = professionalData ?? [];

  if (!professionals.length) {
    return (
      <>
        <PageHeader
          eyebrow="Equipe"
          title="Horários e folgas"
          description="Expediente semanal, folgas e bloqueios da equipe."
        />
        <EmptyState
          title="Nenhum profissional ativo"
          description="Cadastre um profissional para configurar o expediente."
        />
      </>
    );
  }

  const selected =
    professionals.find((item) => item.id === profissional) ?? professionals[0];

  const [{ data: ruleData }, { data: blockData }] = await Promise.all([
    supabase
      .from("professional_availability")
      .select("weekday,starts_at,ends_at,slot_interval_minutes")
      .eq("barbershop_id", tenant.id)
      .eq("professional_id", selected.id)
      .eq("active", true)
      .order("weekday")
      .order("starts_at"),
    supabase
      .from("schedule_blocks")
      .select("id,starts_at,ends_at,reason,professional:professionals(name)")
      .eq("barbershop_id", tenant.id)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(100),
  ]);

  const rules: WeeklyRule[] = (ruleData ?? []).map((rule) => ({
    weekday: rule.weekday,
    startsAt: String(rule.starts_at).slice(0, 5),
    endsAt: String(rule.ends_at).slice(0, 5),
    slotIntervalMinutes: rule.slot_interval_minutes,
  }));

  const blocks: ScheduleBlockRow[] = (blockData ?? []).map((block) => ({
    id: block.id,
    professionalName: first(block.professional)?.name ?? "Profissional",
    startsAt: block.starts_at,
    endsAt: block.ends_at,
    reason: block.reason,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Equipe"
        title="Horários e folgas"
        description="Expediente semanal por profissional, folgas, férias e bloqueios pontuais. A página de agendamento respeita tudo isso na hora."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Expediente de {selected.name}
            </CardTitle>
            {professionals.length > 1 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {professionals.map((item) => (
                  <Link
                    key={item.id}
                    href={`/equipe/horarios?profissional=${item.id}`}
                    aria-current={item.id === selected.id ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                      item.id === selected.id
                        ? "bg-primary/15 text-primary border-transparent"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            <WeeklyAvailabilityEditor
              key={selected.id}
              professionalId={selected.id}
              initialRules={rules}
            />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">
              Folgas, férias e bloqueios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScheduleBlocksCard
              professionals={professionals.map((item) => ({
                id: item.id,
                name: item.name,
              }))}
              blocks={blocks}
              timezone={tenant.timezone}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
