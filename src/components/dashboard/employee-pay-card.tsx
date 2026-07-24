"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  registerEmployeePayment,
  saveEmployeePaySettings,
} from "@/modules/payroll/actions";
import { formatBRL } from "@/lib/financial";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = { success: false, message: "" };

const selectClass =
  "border-input bg-background h-9 w-full rounded-md border px-2 text-sm";

export type EmployeePaySettings = {
  model: "commission" | "fixed" | "hybrid";
  base_salary: number;
  payment_period: "weekly" | "biweekly" | "monthly";
  payment_day: number | null;
  commission_rate?: number | null;
};

export function EmployeePayCard({
  professionalId,
  name,
  monthCommission,
  monthlyPaid,
  settings,
  suggestedReference,
}: {
  professionalId: string;
  name: string;
  monthCommission: number;
  monthlyPaid: number;
  settings: EmployeePaySettings | null;
  suggestedReference: string;
}) {
  const [settingsState, saveSettings, savingSettings] = useActionState(
    saveEmployeePaySettings,
    initialState,
  );
  const [paymentState, registerPayment, registering] = useActionState(
    registerEmployeePayment,
    initialState,
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{name}</span>
          <span className="text-muted-foreground text-xs font-normal">
            Pago no mês:{" "}
            <span className="text-foreground font-mono">
              {formatBRL(monthlyPaid)}
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-2">
        {/* Configuração */}
        <form action={saveSettings} className="space-y-3">
          <input type="hidden" name="professionalId" value={professionalId} />
          <p className="text-sm font-medium">Configuração de pagamento</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`model-${professionalId}`}>Modelo</Label>
              <select
                id={`model-${professionalId}`}
                name="model"
                defaultValue={settings?.model ?? "commission"}
                className={selectClass}
              >
                <option value="commission">Comissão</option>
                <option value="fixed">Salário fixo</option>
                <option value="hybrid">Híbrido</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`period-${professionalId}`}>Período</Label>
              <select
                id={`period-${professionalId}`}
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
              <Label htmlFor={`salary-${professionalId}`}>Salário (R$)</Label>
              <Input
                id={`salary-${professionalId}`}
                name="baseSalary"
                type="number"
                min="0"
                step="0.01"
                defaultValue={settings?.base_salary ?? 0}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`day-${professionalId}`}>Dia de pagamento</Label>
              <Input
                id={`day-${professionalId}`}
                name="paymentDay"
                type="number"
                min="1"
                max="31"
                defaultValue={settings?.payment_day ?? undefined}
                placeholder="ex.: 5"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor={`commission-${professionalId}`}>
                Comissão padrão (%)
              </Label>
              <Input
                id={`commission-${professionalId}`}
                name="commissionRate"
                type="number"
                min="0"
                max="100"
                step="0.5"
                defaultValue={settings?.commission_rate ?? 0}
              />
              <p className="text-muted-foreground text-xs">
                Vale quando o serviço não define comissão própria — a taxa do
                serviço, quando maior que zero, tem precedência.
              </p>
            </div>
          </div>
          {settingsState.message ? (
            <Alert variant={settingsState.success ? "default" : "destructive"}>
              {settingsState.success ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : null}
              <AlertDescription>{settingsState.message}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={savingSettings}
          >
            {savingSettings ? "Salvando…" : "Salvar configuração"}
          </Button>
        </form>

        {/* Registrar pagamento */}
        <form
          action={registerPayment}
          className="space-y-3 lg:border-l lg:pl-5"
        >
          <input type="hidden" name="professionalId" value={professionalId} />
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Registrar pagamento</p>
            <span className="text-muted-foreground text-xs">
              Comissão no mês:{" "}
              <span className="text-foreground font-mono">
                {formatBRL(monthCommission)}
              </span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`amount-${professionalId}`}>Valor (R$)</Label>
              <Input
                id={`amount-${professionalId}`}
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={
                  monthCommission > 0 ? monthCommission.toFixed(2) : ""
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`ref-${professionalId}`}>Referência</Label>
              <Input
                id={`ref-${professionalId}`}
                name="reference"
                defaultValue={suggestedReference}
                maxLength={120}
              />
            </div>
          </div>
          {paymentState.message ? (
            <Alert variant={paymentState.success ? "default" : "destructive"}>
              {paymentState.success ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : null}
              <AlertDescription>{paymentState.message}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" size="sm" disabled={registering}>
            {registering ? "Registrando…" : "Registrar pagamento"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
