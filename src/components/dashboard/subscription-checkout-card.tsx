"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { CreditCard, Loader2, TicketPercent } from "lucide-react";
import {
  previewCoupon,
  startCheckout,
  type CheckoutState,
  type CouponPreview,
} from "@/modules/subscription/checkout";
import { formatPriceBRL } from "@/lib/billing";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CheckoutState = { success: false, message: "" };

type Period = "monthly" | "yearly";

/**
 * Contratação do plano (Fase 5 §5.1 e §5.2).
 *
 * Até aqui esta tela dizia ao dono que o pagamento online não existia e o
 * mandava falar com o suporte — e não havia como contratar o anual, porque a
 * assinatura não sabia guardar periodicidade. Agora a escolha é de verdade, e
 * a economia do anual aparece em reais, não em porcentagem: "R$ 219 por ano"
 * é uma frase que o dono de barbearia confere de cabeça.
 */
export function SubscriptionCheckoutCard({
  plan,
  planLabel,
  monthlyCents,
  yearlyCents,
  configured,
  isOwner,
  brand,
  suggestedCoupon = "",
  supportNote,
}: {
  plan: "starter" | "plus";
  planLabel: string;
  monthlyCents: number;
  yearlyCents: number;
  configured: boolean;
  isOwner: boolean;
  brand: string;
  /** Código que veio pelo link do e-mail da régua — só pré-preenche o campo. */
  suggestedCoupon?: string;
  supportNote: string;
}) {
  const [period, setPeriod] = useState<Period>("yearly");
  const [couponInput, setCouponInput] = useState(suggestedCoupon.toUpperCase());
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [checking, startChecking] = useTransition();
  const [state, action, pending] = useActionState(startCheckout, initialState);

  /** Trocar de periodicidade invalida o cupom: ele pode valer só no anual. */
  function choosePeriod(next: Period) {
    setPeriod(next);
    setCoupon(null);
  }

  useEffect(() => {
    if (state.success && state.redirectUrl) {
      window.location.href = state.redirectUrl;
    }
  }, [state]);

  const listCents = period === "yearly" ? yearlyCents : monthlyCents;
  const discountCents = coupon?.valid ? (coupon.discountCents ?? 0) : 0;
  const totalCents = listCents - discountCents;
  const yearlySavingsCents = monthlyCents * 12 - yearlyCents;
  const yearlyMonthEquivalent = Math.round(yearlyCents / 12);

  function applyCoupon() {
    startChecking(async () => {
      setCoupon(await previewCoupon(plan, period, couponInput));
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="size-4" /> Periodicidade e pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="radiogroup"
          aria-label="Periodicidade do plano"
          className="grid gap-3 sm:grid-cols-2"
        >
          <PeriodOption
            selected={period === "monthly"}
            onSelect={() => choosePeriod("monthly")}
            title="Mensal"
            price={`${formatPriceBRL(monthlyCents)}/mês`}
            note="Renova todo mês. Cancele quando quiser, por aqui mesmo."
          />
          <PeriodOption
            selected={period === "yearly"}
            onSelect={() => choosePeriod("yearly")}
            title="Anual à vista"
            badge="Mais escolhido"
            price={`${formatPriceBRL(yearlyCents)}/ano`}
            note={`Sai por ${formatPriceBRL(yearlyMonthEquivalent)} por mês — economia de ${formatPriceBRL(yearlySavingsCents)} no ano.`}
          />
        </div>

        {configured && isOwner ? (
          <form action={action} className="space-y-4">
            <input type="hidden" name="plan" value={plan} />
            <input type="hidden" name="period" value={period} />
            <input
              type="hidden"
              name="coupon"
              value={coupon?.valid ? (coupon.code ?? "") : ""}
            />

            <div className="grid gap-2">
              <Label htmlFor="coupon-input" className="flex items-center gap-2">
                <TicketPercent className="size-4" /> Tem um cupom?
              </Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="coupon-input"
                  value={couponInput}
                  onChange={(event) =>
                    setCouponInput(event.target.value.toUpperCase())
                  }
                  placeholder="Código do cupom"
                  maxLength={40}
                  autoComplete="off"
                  className="max-w-56 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={applyCoupon}
                  disabled={checking || !couponInput.trim()}
                >
                  {checking ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Aplicar"
                  )}
                </Button>
              </div>
              {coupon ? (
                <Alert variant={coupon.valid ? "success" : "destructive"}>
                  <AlertDescription>{coupon.message}</AlertDescription>
                </Alert>
              ) : null}
            </div>

            <dl className="bg-muted/40 grid gap-1 rounded-xl border p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Plano {planLabel} · {period === "yearly" ? "anual" : "mensal"}
                </dt>
                <dd className="font-mono">{formatPriceBRL(listCents)}</dd>
              </div>
              {discountCents > 0 ? (
                <div className="text-success flex justify-between">
                  <dt>Cupom {coupon?.code}</dt>
                  <dd className="font-mono">
                    −{formatPriceBRL(discountCents)}
                  </dd>
                </div>
              ) : null}
              <div className="mt-1 flex justify-between border-t pt-2 text-base font-semibold">
                <dt>Total agora</dt>
                <dd className="font-mono">{formatPriceBRL(totalCents)}</dd>
              </div>
            </dl>

            {state.message && !state.success ? (
              <Alert variant="destructive">
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              disabled={pending}
              className="w-full sm:w-auto"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Assinar {planLabel} · {formatPriceBRL(totalCents)}
            </Button>
            <p className="text-muted-foreground text-xs leading-5">
              Você vai para o ambiente do Mercado Pago para pagar com cartão,
              Pix ou boleto. Nenhum dado de cartão passa pelo {brand} — nem é
              guardado aqui.
              {discountCents > 0
                ? " O desconto do cupom vale na primeira cobrança; as seguintes voltam ao preço de tabela."
                : ""}
            </p>
          </form>
        ) : (
          <p className="text-muted-foreground text-sm leading-6">
            {isOwner
              ? supportNote
              : "Apenas o proprietário da barbearia pode contratar ou trocar o plano."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PeriodOption({
  selected,
  onSelect,
  title,
  price,
  note,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  price: string;
  note: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`min-h-11 rounded-xl border p-4 text-left transition ${
        selected
          ? "border-primary bg-primary/5 ring-primary/30 ring-2"
          : "hover:border-border-control border"
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`text-xs font-medium tracking-wide uppercase ${
            selected ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {title}
        </span>
        {badge ? (
          <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide uppercase">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="mt-1 block font-mono text-xl font-semibold">
        {price}
      </span>
      <span className="text-muted-foreground mt-1 block text-xs leading-5">
        {note}
      </span>
    </button>
  );
}
