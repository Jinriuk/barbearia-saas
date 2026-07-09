import Link from "next/link";
import {
  Building2,
  CircleAlert,
  CircleCheck,
  CircleDollarSign,
  CircleX,
  Sparkles,
} from "lucide-react";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { accessState, formatPriceBRL, planLabelFromKey } from "@/lib/billing";
import type { SubscriptionStatus } from "@/types/domain";
import { AdminRowActions } from "@/components/platform/admin-row-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

type ShopRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  subscriptions: Array<{
    status: SubscriptionStatus;
    plan: string;
    price_cents: number;
    trial_ends_at: string | null;
    current_period_end: string | null;
  }>;
  memberships: Array<{
    role: string;
    profiles: { name: string; auth_user_id: string } | null;
  }>;
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  trialing: {
    label: "Em teste",
    className:
      "border-sky-300 text-sky-700 dark:text-sky-300 dark:border-sky-800",
  },
  active: {
    label: "Ativa",
    className:
      "border-emerald-300 text-emerald-700 dark:text-emerald-300 dark:border-emerald-800",
  },
  past_due: {
    label: "Em atraso",
    className:
      "border-amber-300 text-amber-700 dark:text-amber-300 dark:border-amber-800",
  },
  suspended: {
    label: "Suspensa",
    className:
      "border-orange-300 text-orange-700 dark:text-orange-300 dark:border-orange-800",
  },
  canceled: {
    label: "Cancelada",
    className:
      "border-red-300 text-red-700 dark:text-red-300 dark:border-red-800",
  },
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(iso));
}

export default async function AdminPage() {
  await requirePlatformAdmin();
  const supabase = createSupabaseAdminClient();

  const [{ data: shops }, usersResult] = await Promise.all([
    supabase
      .from("barbershops")
      .select(
        "id, name, slug, created_at, subscriptions(status, plan, price_cents, trial_ends_at, current_period_end), memberships(role, profiles(name, auth_user_id))",
      )
      .order("created_at", { ascending: false }),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const emailByAuthId = new Map(
    (usersResult.data?.users ?? []).map((user) => [user.id, user.email ?? ""]),
  );

  const rows = ((shops ?? []) as unknown as ShopRow[]).map((shop) => {
    const sub = shop.subscriptions[0] ?? null;
    const owner = shop.memberships.find((m) => m.role === "owner");
    return {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      createdAt: shop.created_at,
      sub,
      ownerName: owner?.profiles?.name ?? "—",
      ownerEmail: owner?.profiles
        ? (emailByAuthId.get(owner.profiles.auth_user_id) ?? "")
        : "",
      access: accessState(
        sub
          ? {
              status: sub.status,
              plan: sub.plan,
              priceCents: sub.price_cents,
              trialEndsAt: sub.trial_ends_at,
              currentPeriodEnd: sub.current_period_end,
            }
          : null,
      ),
    };
  });

  const count = (statuses: SubscriptionStatus[]) =>
    rows.filter((row) => row.sub && statuses.includes(row.sub.status)).length;
  const mrrCents = rows
    .filter((row) => row.sub && ["active", "past_due"].includes(row.sub.status))
    .reduce((total, row) => total + (row.sub?.price_cents ?? 0), 0);

  const metrics = [
    { label: "Barbearias", value: String(rows.length), icon: Building2 },
    { label: "Em teste", value: String(count(["trialing"])), icon: Sparkles },
    { label: "Ativas", value: String(count(["active"])), icon: CircleCheck },
    {
      label: "Inadimplentes",
      value: String(count(["past_due", "suspended"])),
      icon: CircleAlert,
    },
    { label: "Canceladas", value: String(count(["canceled"])), icon: CircleX },
    {
      label: "Receita mensal (MRR)",
      value: formatPriceBRL(mrrCents),
      icon: CircleDollarSign,
    },
  ];

  return (
    <>
      <div className="mb-7">
        <p className="text-primary mb-2 text-xs font-semibold tracking-[0.18em] uppercase">
          Visão da plataforma
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Super-admin</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Todas as barbearias, quem paga e quem não paga — com a régua de
          cobrança rodando sozinha.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-xs font-medium">
                {metric.label}
              </CardTitle>
              <metric.icon className="text-primary size-4" />
            </CardHeader>
            <CardContent>
              <p className="font-mono text-xl font-semibold">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Barbearias</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barbearia</TableHead>
                <TableHead>Dono</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Assinatura</TableHead>
                <TableHead>Vence/termina</TableHead>
                <TableHead>Criada</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const badge = row.sub
                  ? (STATUS_BADGE[row.sub.status] ?? null)
                  : null;
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-medium">{row.name}</p>
                      <Link
                        href={`/${row.slug}`}
                        target="_blank"
                        className="text-muted-foreground text-xs hover:underline"
                      >
                        /{row.slug}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{row.ownerName}</p>
                      <p className="text-muted-foreground text-xs">
                        {row.ownerEmail}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {planLabelFromKey(row.sub?.plan)}
                      </span>
                      <p className="text-muted-foreground font-mono text-xs">
                        {row.sub ? formatPriceBRL(row.sub.price_cents) : "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      {badge ? (
                        <Badge variant="outline" className={badge.className}>
                          {badge.label}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Sem assinatura</Badge>
                      )}
                      {row.access === "warn" ? (
                        <p className="mt-1 text-xs text-amber-600">venceu</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(
                        row.sub?.status === "trialing"
                          ? row.sub.trial_ends_at
                          : (row.sub?.current_period_end ?? null),
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(row.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <AdminRowActions
                        barbershopId={row.id}
                        status={row.sub?.status ?? null}
                        plan={row.sub?.plan ?? "starter"}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
