"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { saveMembershipPlan } from "@/modules/memberships/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useActionToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type ServiceOption = { id: string; name: string; price: number };

type PlanInput = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  period: string;
  active: boolean;
  entitlements: { service_id: string; uses_per_period: number }[];
};

const initialState: ActionState = { success: false, message: "" };

const PERIODS = [
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "yearly", label: "Anual" },
];

/**
 * Criação/edição de plano de assinatura do cliente: preço, periodicidade e
 * serviços incluídos com limite de usos por período.
 */
export function MembershipPlanSheet({
  plan,
  services,
}: {
  plan?: PlanInput;
  services: ServiceOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await saveMembershipPlan(prev, formData);
      if (result.success) setOpen(false);
      return result;
    },
    initialState,
  );
  useActionToast(state);
  const editing = Boolean(plan);
  const included = new Map(
    (plan?.entitlements ?? []).map((item) => [
      item.service_id,
      item.uses_per_period,
    ]),
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {editing ? (
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Editar plano ${plan!.name}`}
          >
            <Pencil />
          </Button>
        ) : (
          <Button className="w-full">
            <Plus className="size-4" /> Novo plano
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editing ? "Editar plano" : "Novo plano"}</SheetTitle>
          <SheetDescription>
            O cliente paga o valor por período e usa os serviços incluídos até o
            limite. Mudar o plano não altera contratos já vendidos.
          </SheetDescription>
        </SheetHeader>
        <form action={formAction} className="flex flex-1 flex-col gap-4 p-4">
          {state.message && !state.success ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          {plan ? <input type="hidden" name="id" value={plan.id} /> : null}
          <div className="space-y-2">
            <Label htmlFor="plan-name">Nome do plano</Label>
            <Input
              id="plan-name"
              name="name"
              defaultValue={plan?.name}
              placeholder="Clube do corte"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="plan-price">Preço por período</Label>
              <Input
                id="plan-price"
                name="price"
                type="number"
                min="1"
                step="0.01"
                defaultValue={plan?.price}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-period">Periodicidade</Label>
              <select
                id="plan-period"
                name="period"
                defaultValue={plan?.period ?? "monthly"}
                className="border-border-control bg-field focus-visible:border-focus-ring focus-visible:ring-focus-ring/45 h-12 w-full rounded-lg border px-3 text-sm transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:h-11"
              >
                {PERIODS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-description">Descrição (opcional)</Label>
            <Textarea
              id="plan-description"
              name="description"
              rows={2}
              defaultValue={plan?.description ?? ""}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              Serviços incluídos e usos por período
            </legend>
            {services.length ? (
              <div className="space-y-2">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <input type="hidden" name="serviceIds" value={service.id} />
                    <label className="flex min-w-0 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name={`include-${service.id}`}
                        defaultChecked={included.has(service.id)}
                        className="size-4 rounded border"
                      />
                      <span className="truncate">{service.name}</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        name={`uses-${service.id}`}
                        type="number"
                        min="1"
                        max="99"
                        defaultValue={included.get(service.id) ?? 1}
                        className="h-8 w-16 text-center"
                        aria-label={`Usos de ${service.name} por período`}
                      />
                      <span className="text-muted-foreground text-xs">
                        usos
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Cadastre serviços antes de montar um plano.
              </p>
            )}
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              defaultChecked={plan ? plan.active : true}
              className="size-4 rounded border"
            />
            Plano disponível para venda
          </label>
          <SheetFooter className="mt-auto px-0">
            <Button type="submit" className="w-full" disabled={pending}>
              {editing ? "Salvar alterações" : "Criar plano"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
