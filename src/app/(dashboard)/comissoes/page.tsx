import Link from "next/link";
import { Percent } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { getUtcMonthRange } from "@/lib/dates";
import { formatBRL } from "@/lib/financial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const tenant = await requireTenant();

  if (!can(tenant.role, "reports:view")) {
    return (
      <>
        <PageHeader
          eyebrow="Financeiro"
          title="Comissões"
          description="Comissões da equipe por período."
        />
        <EmptyState
          title="Acesso restrito"
          description="Comissões são visíveis para proprietário e gerente."
        />
      </>
    );
  }

  const { start, end, year, month } = getUtcMonthRange(tenant.timezone, mes);
  const previous =
    month === 1 ? monthKey(year - 1, 12) : monthKey(year, month - 1);
  const next = month === 12 ? monthKey(year + 1, 1) : monthKey(year, month + 1);

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("appointments")
    .select(
      "id,starts_at,professional:professionals(id,name),service:services(name,price,commission_rate)",
    )
    .eq("barbershop_id", tenant.id)
    .eq("status", "completed")
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .limit(2000);

  const rows = (data ?? []).flatMap((item) => {
    const professional = first(item.professional);
    const service = first(item.service);
    if (!professional || !service) return [];
    const price = Number(service.price);
    const rate = Number(service.commission_rate);
    return [
      {
        professionalId: professional.id,
        professionalName: professional.name,
        price,
        commission: (price * rate) / 100,
      },
    ];
  });

  const byProfessional = new Map<
    string,
    { name: string; services: number; revenue: number; commission: number }
  >();
  for (const row of rows) {
    const entry = byProfessional.get(row.professionalId) ?? {
      name: row.professionalName,
      services: 0,
      revenue: 0,
      commission: 0,
    };
    entry.services += 1;
    entry.revenue += row.price;
    entry.commission += row.commission;
    byProfessional.set(row.professionalId, entry);
  }
  const summary = [...byProfessional.values()].sort(
    (a, b) => b.commission - a.commission,
  );
  const totalCommission = summary.reduce(
    (total, entry) => total + entry.commission,
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Financeiro"
        title="Comissões"
        description="Calculadas sobre os atendimentos concluídos, usando o percentual de cada serviço."
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/comissoes?mes=${previous}`}>← Anterior</Link>
            </Button>
            <span className="min-w-36 text-center text-sm font-medium">
              {monthNames[month - 1]} de {year}
            </span>
            <Button asChild variant="outline" size="sm">
              <Link href={`/comissoes?mes=${next}`}>Próximo →</Link>
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total de comissões no mês
            </CardTitle>
            <Percent className="text-primary size-4" />
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-semibold">
              {formatBRL(totalCommission)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Atendimentos concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-semibold">{rows.length}</p>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Por profissional</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-right">Atendimentos</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((entry) => (
                  <TableRow key={entry.name}>
                    <TableCell className="font-medium">{entry.name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {entry.services}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatBRL(entry.revenue)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatBRL(entry.commission)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="Sem atendimentos concluídos neste mês"
              description="Conclua os atendimentos na Agenda para gerar comissões. O percentual é definido em cada serviço."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
