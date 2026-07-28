"use client";

import { useActionState, useState } from "react";
import { Ban, Pause, Play, RefreshCcw } from "lucide-react";
import {
  renewMembership,
  setMembershipStatus,
} from "@/modules/memberships/actions";
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

const initialState: ActionState = { success: false, message: "" };

/**
 * Ações do contrato: renovar (com forma de pagamento), pausar/retomar e
 * cancelar. Renovação abre um painel curto; as demais são um toque.
 */
export function MembershipActions({
  membershipId,
  clientName,
  status,
  canManage,
}: {
  membershipId: string;
  clientName: string;
  status: "active" | "due_soon" | "paused" | "past_due";
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await renewMembership(prev, formData);
      if (result.success) setOpen(false);
      return result;
    },
    initialState,
  );

  return (
    <div className="flex items-center justify-end gap-1">
      {status !== "paused" ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline">
              <RefreshCcw className="size-3.5" /> Renovar
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full gap-0 sm:max-w-sm">
            <SheetHeader>
              <SheetTitle>Renovar plano</SheetTitle>
              <SheetDescription>
                Registra o pagamento do próximo período de {clientName}.
              </SheetDescription>
            </SheetHeader>
            <form
              action={formAction}
              className="flex flex-1 flex-col gap-4 p-4"
            >
              {state.message && !state.success ? (
                <Alert variant="destructive">
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              ) : null}
              <input type="hidden" name="membershipId" value={membershipId} />
              <div className="space-y-2">
                <Label htmlFor={`renew-method-${membershipId}`}>
                  Forma de pagamento
                </Label>
                <select
                  id={`renew-method-${membershipId}`}
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
                  Registrar renovação
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      ) : null}
      {canManage ? (
        <>
          <form action={setMembershipStatus}>
            <input type="hidden" name="membershipId" value={membershipId} />
            <input
              type="hidden"
              name="statusAction"
              value={status === "paused" ? "resume" : "pause"}
            />
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              title={status === "paused" ? "Retomar plano" : "Pausar plano"}
              aria-label={
                status === "paused"
                  ? `Retomar plano de ${clientName}`
                  : `Pausar plano de ${clientName}`
              }
            >
              {status === "paused" ? (
                <Play className="size-4" />
              ) : (
                <Pause className="size-4" />
              )}
            </Button>
          </form>
          <form action={setMembershipStatus}>
            <input type="hidden" name="membershipId" value={membershipId} />
            <input type="hidden" name="statusAction" value="cancel" />
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              title="Cancelar plano (definitivo)"
              aria-label={`Cancelar plano de ${clientName}`}
            >
              <Ban className="size-4" />
            </Button>
          </form>
        </>
      ) : null}
    </div>
  );
}
