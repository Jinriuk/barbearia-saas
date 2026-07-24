import {
  BadgeCheck,
  CalendarClock,
  CircleAlert,
  CreditCard,
  Lock,
  Sparkles,
} from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import {
  accessState,
  daysLeft,
  formatPriceBRL,
  planConfig,
} from "@/lib/billing";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_LABEL: Record<string, string> = {
  trialing: "Período de teste",
  active: "Ativa",
  past_due: "Pagamento pendente",
  suspended: "Suspensa",
  canceled: "Cancelada",
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function SubscriptionPage() {
  const tenant = await requireTenant({ allowLocked: true });
  const sub = tenant.subscription;
  const state = accessState(sub);
  const plan = planConfig(sub?.plan ?? tenant.plan);
  const isOwner = tenant.role === "owner";

  const trialDays =
    sub?.status === "trialing" ? daysLeft(sub.trialEndsAt) : null;
  const periodEnd = formatDate(sub?.currentPeriodEnd ?? null);

  return (
    <>
      <PageHeader
        eyebrow="Plano e cobrança"
        title="Assinatura"
        description="Status do seu plano, próximas cobranças e regularização."
        action={
          sub ? (
            <Badge
              variant="outline"
              className={
                state === "ok"
                  ? "border-emerald-300 text-emerald-700 dark:text-emerald-300"
                  : state === "warn"
                    ? "border-amber-300 text-amber-700 dark:text-amber-300"
                    : "border-red-300 text-red-700 dark:text-red-300"
              }
            >
              {STATUS_LABEL[sub.status] ?? sub.status}
            </Badge>
          ) : null
        }
      />

      <div className="grid max-w-4xl gap-4">
        {/* Estado atual, com a mensagem certa para cada situação */}
        {state === "locked" || state === "gone" ? (
          <Alert variant="destructive">
            <Lock className="size-4" />
            <AlertTitle>
              {state === "gone"
                ? "Assinatura cancelada"
                : "Painel bloqueado por pagamento pendente"}
            </AlertTitle>
            <AlertDescription>
              {state === "gone"
                ? "A assinatura foi cancelada e a página pública saiu do ar. Para voltar a usar o sistema, reative a assinatura."
                : "A mensalidade está em atraso há mais de 5 dias. Sua página pública continua no ar, mas o painel fica bloqueado até regularizar. Sem pagamento em 15 dias do vencimento, a assinatura é cancelada automaticamente."}
              {!isOwner
                ? " Avise o proprietário da barbearia para regularizar."
                : null}
            </AlertDescription>
          </Alert>
        ) : null}

        {state === "warn" ? (
          <Alert>
            <CircleAlert className="size-4 text-amber-600" />
            <AlertTitle>
              {sub?.status === "trialing"
                ? "Seu período de teste terminou"
                : "Mensalidade em aberto"}
            </AlertTitle>
            <AlertDescription>
              Regularize o pagamento para manter o acesso. Em 5 dias do
              vencimento o painel é bloqueado; em 15 dias a assinatura é
              cancelada — tudo automático.
            </AlertDescription>
          </Alert>
        ) : null}

        {sub?.status === "trialing" && state === "ok" ? (
          <Alert>
            <Sparkles className="text-primary size-4" />
            <AlertTitle>
              Teste grátis:{" "}
              {trialDays === 1 ? "último dia" : `${trialDays} dias restantes`}
            </AlertTitle>
            <AlertDescription>
              Aproveite tudo do plano {plan.label}. A primeira cobrança só
              acontece quando o teste terminar.
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck className="text-primary size-4" /> Plano {plan.label}
            </CardTitle>
            <p className="font-mono text-lg font-semibold">
              {formatPriceBRL(sub?.priceCents ?? plan.priceCents)}
              <span className="text-muted-foreground text-xs font-normal">
                /mês
              </span>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <BadgeCheck className="text-primary mt-0.5 size-4 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            {periodEnd && sub?.status !== "trialing" ? (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <CalendarClock className="size-4" />
                {sub?.status === "canceled"
                  ? `Acesso encerrado em ${periodEnd}.`
                  : `Período atual até ${periodEnd}.`}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-4" /> Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm leading-6">
              O pagamento online recorrente (cartão e Pix via Mercado Pago) está
              em configuração. Assim que estiver ativo, você poderá assinar e
              regularizar por aqui, sem falar com ninguém.
            </p>
            <Button disabled title="Disponível em breve">
              <CreditCard className="size-4" /> Pagar com Mercado Pago — em
              breve
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
