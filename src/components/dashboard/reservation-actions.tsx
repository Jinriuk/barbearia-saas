"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";
import {
  cancelProductSale,
  confirmProductSale,
} from "@/modules/product-sales/actions";
import type { ActionState } from "@/types/domain";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { success: false, message: "" };

export function ReservationActions({ id }: { id: string }) {
  const [confirmState, confirm, confirming] = useActionState(
    confirmProductSale,
    initialState,
  );
  const [cancelState, cancel, canceling] = useActionState(
    cancelProductSale,
    initialState,
  );
  const error =
    (!confirmState.success && confirmState.message) ||
    (!cancelState.success && cancelState.message) ||
    "";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <form action={confirm}>
          <input type="hidden" name="id" value={id} />
          <Button
            size="sm"
            disabled={confirming || canceling}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Check className="size-3.5" /> Confirmar
          </Button>
        </form>
        <form action={cancel}>
          <input type="hidden" name="id" value={id} />
          <Button
            size="sm"
            variant="ghost"
            disabled={confirming || canceling}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="size-3.5" /> Cancelar
          </Button>
        </form>
      </div>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
