"use client";

import { useActionState } from "react";
import { CheckCircle2, PackagePlus } from "lucide-react";
import { registerMovement } from "@/modules/inventory/actions";
import type { ActionState } from "@/types/domain";
import { MOVEMENT_TYPES } from "@/lib/inventory";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = { success: false, message: "" };

export function InventoryMovementForm({
  products,
}: {
  products: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    registerMovement,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PackagePlus className="size-4" /> Registrar entrada ou saída
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.message ? (
            <Alert variant={state.success ? "success" : "destructive"}>
              {state.success ? (
                <CheckCircle2 className="text-success size-4" />
              ) : null}
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="mov-product">Produto</Label>
            <select
              id="mov-product"
              name="productId"
              required
              className="border-border-control bg-field focus-visible:border-focus-ring focus-visible:ring-focus-ring/45 h-12 w-full rounded-lg border px-3 text-sm transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:h-11"
              defaultValue=""
            >
              <option value="" disabled>
                Escolha o produto
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mov-type">Tipo</Label>
            <select
              id="mov-type"
              name="type"
              className="border-border-control bg-field focus-visible:border-focus-ring focus-visible:ring-focus-ring/45 h-12 w-full rounded-lg border px-3 text-sm transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:h-11"
              defaultValue="purchase"
            >
              {MOVEMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mov-quantity">Quantidade</Label>
              <Input
                id="mov-quantity"
                name="quantity"
                type="number"
                min="0.001"
                step="0.001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mov-cost">Custo unit. (R$)</Label>
              <Input
                id="mov-cost"
                name="unitCost"
                type="number"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mov-reason">Motivo (opcional)</Label>
            <Input id="mov-reason" name="reason" maxLength={300} />
          </div>
          <Button disabled={pending} className="w-full">
            {pending ? "Registrando…" : "Registrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
