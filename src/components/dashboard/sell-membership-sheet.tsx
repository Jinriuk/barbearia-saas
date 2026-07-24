"use client";

import { useActionState, useState } from "react";
import { HandCoins } from "lucide-react";
import { sellMembership } from "@/modules/memberships/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PAYMENT_METHODS } from "@/lib/financial";

type ClientOption = { id: string; name: string; phone: string | null };
type PlanOption = {
  id: string;
  name: string;
  price: number;
  periodLabel: string;
};

const initialState: ActionState = { success: false, message: "" };

/**
 * Venda de plano no balcão: cliente + plano + forma de pagamento. O clube é
 * pré-pago — a RPC registra contrato, pagamento e receita numa transação.
 */
export function SellMembershipSheet({
  clients,
  plans,
}: {
  clients: ClientOption[];
  plans: PlanOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await sellMembership(prev, formData);
      if (result.success) setOpen(false);
      return result;
    },
    initialState,
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="w-full" variant="secondary">
          <HandCoins className="size-4" /> Vender plano
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Vender plano</SheetTitle>
          <SheetDescription>
            O pagamento do período é registrado agora, junto com o contrato.
          </SheetDescription>
        </SheetHeader>
        <form action={formAction} className="flex flex-1 flex-col gap-4 p-4">
          {state.message && !state.success ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="sell-client">Cliente</Label>
            <select
              id="sell-client"
              name="clientId"
              required
              defaultValue=""
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="" disabled>
                Escolha o cliente
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.phone ? ` — ${client.phone}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sell-plan">Plano</Label>
            <select
              id="sell-plan"
              name="planId"
              required
              defaultValue=""
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="" disabled>
                Escolha o plano
              </option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — R${" "}
                  {plan.price.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  ({plan.periodLabel})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sell-method">Forma de pagamento</Label>
            <select
              id="sell-method"
              name="paymentMethod"
              required
              defaultValue=""
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="" disabled>
                Como o cliente pagou?
              </option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
          <SheetFooter className="mt-auto px-0">
            <Button type="submit" className="w-full" disabled={pending}>
              Registrar venda
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
