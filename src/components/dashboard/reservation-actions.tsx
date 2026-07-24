"use client";

import { useActionState, useState } from "react";
import { Check, X } from "lucide-react";
import {
  cancelProductSale,
  confirmProductSale,
} from "@/modules/product-sales/actions";
import { PAYMENT_METHODS } from "@/lib/financial";
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
  // Vendido ≠ recebido: por padrão a venda entra como "a receber"; o
  // operador pode registrar o recebimento já na confirmação.
  const [method, setMethod] = useState("");
  const error =
    (!confirmState.success && confirmState.message) ||
    (!cancelState.success && cancelState.message) ||
    "";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <form action={confirm} className="flex items-center gap-1.5">
          <input type="hidden" name="id" value={id} />
          <select
            name="paymentMethod"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            aria-label="Forma de pagamento da venda"
            className="border-input bg-background h-8 rounded-lg border px-2 text-xs"
          >
            <option value="">Receber depois</option>
            {PAYMENT_METHODS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
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
