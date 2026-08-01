"use client";

import { useActionState, useRef, useState } from "react";
import { CheckCircle2, HandCoins, Wallet } from "lucide-react";
import {
  registerEmployeeAdvance,
  registerEmployeePayment,
  saveEmployeePaySettings,
} from "@/modules/payroll/actions";
import { formatBRL } from "@/lib/financial";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MaskedInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = { success: false, message: "" };

const selectClass =
  "border-border-control bg-field focus-visible:border-focus-ring focus-visible:ring-focus-ring/45 h-12 w-full rounded-lg border px-3 text-sm transition-colors outline-none focus-visible:ring-3 md:h-11";

export type CommissionClosing = {
  professionalId: string;
  name: string;
  completedCount: number;
  /** Serviços, sobre o valor congelado na conclusão (Fase 0 §0.9). */
  producedServices: number;
  producedProducts: number;
  producedTotal: number;
  commission: number;
  /** Quanto da competência já virou caixa (Fase 0 §0.14). */
  receivedProduced: number;
  receivedCommission: number;
  baseSalary: number;
  model: "commission" | "fixed" | "hybrid";
  advances: number;
  paid: number;
  toPay: number;
};

export type PaySettings = {
  model: "commission" | "fixed" | "hybrid";
  base_salary: number;
  payment_period: "weekly" | "biweekly" | "monthly";
  payment_day: number | null;
  commission_rate?: number | null;
};

const modelLabels: Record<CommissionClosing["model"], string> = {
  commission: "Comissão",
  fixed: "Salário fixo",
  hybrid: "Salário + comissão",
};

/**
 * Fechamento por profissional (Fase 3 — item 3.4).
 *
 * Três coisas que faltavam:
 *  · TOTAL PRODUZIDO — sem ele o profissional não consegue conferir a
 *    própria comissão, e conferência de comissão é o que evita briga.
 *  · VALE — abatido aqui, não no papel.
 *  · VALOR A PAGAR CALCULADO — é texto, não o default de um input editável.
 *    Quem quiser pagar outro valor abre "pagar valor diferente" e assume a
 *    escolha; o padrão nunca é um número que aceita ser sobrescrito por
 *    engano.
 */
export function CommissionClosingCard({
  closing,
  settings,
  suggestedReference,
  periodLabel,
}: {
  closing: CommissionClosing;
  settings: PaySettings | null;
  suggestedReference: string;
  periodLabel: string;
}) {
  const [paymentState, registerPayment, registeringPayment] = useActionState(
    registerEmployeePayment,
    initialState,
  );
  const [advanceState, registerAdvance, registeringAdvance] = useActionState(
    registerEmployeeAdvance,
    initialState,
  );
  const [settingsState, saveSettings, savingSettings] = useActionState(
    saveEmployeePaySettings,
    initialState,
  );
  const [customAmount, setCustomAmount] = useState(false);
  const advanceRef = useRef<HTMLFormElement>(null);

  const earned =
    closing.model === "fixed"
      ? closing.baseSalary
      : closing.model === "hybrid"
        ? closing.baseSalary + closing.commission
        : closing.commission;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-baseline justify-between gap-2 text-base">
          <span>{closing.name}</span>
          <span className="text-muted-foreground text-xs font-normal">
            {modelLabels[closing.model]} · {closing.completedCount} atendimento
            {closing.completedCount === 1 ? "" : "s"} em {periodLabel}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Extrato do fechamento — a conta inteira, na ordem em que o dono
            faria no papel. */}
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <Row
            label="Total produzido"
            value={formatBRL(closing.producedTotal)}
            hint={`Serviços ${formatBRL(closing.producedServices)} · produtos ${formatBRL(closing.producedProducts)} · ${formatBRL(closing.receivedProduced)} recebido`}
            strong
          />
          {closing.model !== "fixed" ? (
            <Row
              label="Comissão apurada"
              value={formatBRL(closing.commission)}
              hint={`${formatBRL(closing.receivedCommission)} já entrou em caixa`}
            />
          ) : null}
          {closing.model !== "commission" ? (
            <Row label="Salário" value={formatBRL(closing.baseSalary)} />
          ) : null}
          <Row
            label="Vales no período"
            value={closing.advances ? `− ${formatBRL(closing.advances)}` : "—"}
          />
          <Row
            label="Já pago no período"
            value={closing.paid ? `− ${formatBRL(closing.paid)}` : "—"}
          />
        </dl>

        <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
          <div>
            <p className="text-muted-foreground text-xs">Valor a pagar</p>
            <p className="font-mono text-2xl font-semibold">
              {formatBRL(closing.toPay)}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {formatBRL(earned)} de ganho − {formatBRL(closing.advances)} de
              vale − {formatBRL(closing.paid)} já pago
            </p>
          </div>

          <form
            action={registerPayment}
            className="flex flex-wrap items-end gap-2"
          >
            <input
              type="hidden"
              name="professionalId"
              value={closing.professionalId}
            />
            {customAmount ? (
              <div className="space-y-1.5">
                <Label htmlFor={`amount-${closing.professionalId}`}>
                  Valor a registrar (R$)
                </Label>
                <MaskedInput
                  mask="currency"
                  id={`amount-${closing.professionalId}`}
                  name="amount"
                  defaultValue={closing.toPay.toFixed(2)}
                  className="w-36"
                  required
                />
              </div>
            ) : (
              <input
                type="hidden"
                name="amount"
                value={closing.toPay.toFixed(2)}
              />
            )}
            <div className="space-y-1.5">
              <Label htmlFor={`ref-${closing.professionalId}`}>
                Referência
              </Label>
              <Input
                id={`ref-${closing.professionalId}`}
                name="reference"
                defaultValue={suggestedReference}
                maxLength={120}
                className="w-40"
              />
            </div>
            <Button
              type="submit"
              disabled={registeringPayment || closing.toPay <= 0}
              className="h-10"
            >
              <Wallet className="size-4" />
              {registeringPayment ? "Registrando…" : "Registrar pagamento"}
            </Button>
          </form>
        </div>

        {closing.toPay <= 0 ? (
          <p className="text-muted-foreground text-xs">
            Nada a pagar neste período — os vales e pagamentos já cobrem o que
            foi produzido.
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => setCustomAmount((value) => !value)}
          className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
        >
          {customAmount
            ? "Usar o valor calculado"
            : "Pagar valor diferente do calculado"}
        </button>

        {paymentState.message ? (
          <Alert variant={paymentState.success ? "success" : "destructive"}>
            {paymentState.success ? (
              <CheckCircle2 className="text-success size-4" />
            ) : null}
            <AlertDescription>{paymentState.message}</AlertDescription>
          </Alert>
        ) : null}

        <details className="group border-t pt-4">
          <summary className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer list-none items-center gap-1.5 text-sm transition-colors marker:content-none">
            <span className="transition-transform group-open:rotate-90">›</span>
            Dar vale / adiantamento e ajustar a regra de pagamento
          </summary>

          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            {/* Vale */}
            <form
              ref={advanceRef}
              action={async (formData) => {
                await registerAdvance(formData);
                advanceRef.current?.reset();
              }}
              className="space-y-3"
            >
              <input
                type="hidden"
                name="professionalId"
                value={closing.professionalId}
              />
              <p className="flex items-center gap-2 text-sm font-medium">
                <HandCoins className="size-4" /> Dar vale
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`advance-${closing.professionalId}`}>
                    Valor (R$)
                  </Label>
                  <MaskedInput
                    mask="currency"
                    id={`advance-${closing.professionalId}`}
                    name="amount"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`advance-date-${closing.professionalId}`}>
                    Data
                  </Label>
                  <Input
                    id={`advance-date-${closing.professionalId}`}
                    name="referenceDate"
                    type="date"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`advance-notes-${closing.professionalId}`}>
                  Observação
                </Label>
                <Input
                  id={`advance-notes-${closing.professionalId}`}
                  name="notes"
                  maxLength={500}
                  placeholder="Ex.: pediu na terça"
                />
              </div>
              {advanceState.message ? (
                <Alert
                  variant={advanceState.success ? "success" : "destructive"}
                >
                  {advanceState.success ? (
                    <CheckCircle2 className="text-success size-4" />
                  ) : null}
                  <AlertDescription>{advanceState.message}</AlertDescription>
                </Alert>
              ) : null}
              <Button
                type="submit"
                variant="outline"
                disabled={registeringAdvance}
              >
                {registeringAdvance ? "Registrando…" : "Registrar vale"}
              </Button>
              <p className="text-muted-foreground text-xs">
                O vale sai do caixa na hora e é abatido do valor a pagar deste
                período.
              </p>
            </form>

            {/* Regra de pagamento */}
            <form
              action={saveSettings}
              className="space-y-3 lg:border-l lg:pl-6"
            >
              <input
                type="hidden"
                name="professionalId"
                value={closing.professionalId}
              />
              <p className="text-sm font-medium">Regra de pagamento</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`model-${closing.professionalId}`}>
                    Modelo
                  </Label>
                  <select
                    id={`model-${closing.professionalId}`}
                    name="model"
                    defaultValue={settings?.model ?? "commission"}
                    className={selectClass}
                  >
                    <option value="commission">Comissão</option>
                    <option value="fixed">Salário fixo</option>
                    <option value="hybrid">Salário + comissão</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`period-${closing.professionalId}`}>
                    Período
                  </Label>
                  <select
                    id={`period-${closing.professionalId}`}
                    name="paymentPeriod"
                    defaultValue={settings?.payment_period ?? "monthly"}
                    className={selectClass}
                  >
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quinzenal</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`salary-${closing.professionalId}`}>
                    Salário (R$)
                  </Label>
                  <MaskedInput
                    mask="currency"
                    id={`salary-${closing.professionalId}`}
                    name="baseSalary"
                    defaultValue={settings?.base_salary ?? 0}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`day-${closing.professionalId}`}>
                    Dia de pagamento
                  </Label>
                  <Input
                    id={`day-${closing.professionalId}`}
                    name="paymentDay"
                    type="number"
                    min="1"
                    max="31"
                    defaultValue={settings?.payment_day ?? undefined}
                    placeholder="ex.: 5"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor={`commission-${closing.professionalId}`}>
                    Comissão padrão (%)
                  </Label>
                  <MaskedInput
                    mask="percent"
                    id={`commission-${closing.professionalId}`}
                    name="commissionRate"
                    defaultValue={settings?.commission_rate ?? 0}
                  />
                  <p className="text-muted-foreground text-xs">
                    Vale quando o serviço não define comissão própria — a taxa
                    do serviço, quando maior que zero, tem precedência.
                  </p>
                </div>
              </div>
              {settingsState.message ? (
                <Alert
                  variant={settingsState.success ? "success" : "destructive"}
                >
                  {settingsState.success ? (
                    <CheckCircle2 className="text-success size-4" />
                  ) : null}
                  <AlertDescription>{settingsState.message}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" variant="outline" disabled={savingSettings}>
                {savingSettings ? "Salvando…" : "Salvar regra"}
              </Button>
            </form>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-1.5 last:border-b-0">
      <dt className="text-muted-foreground text-sm">
        {label}
        {hint ? (
          <span className="text-muted-foreground block text-xs">{hint}</span>
        ) : null}
      </dt>
      <dd
        className={`shrink-0 font-mono text-sm ${strong ? "font-semibold" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
