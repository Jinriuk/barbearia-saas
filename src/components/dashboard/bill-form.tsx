"use client";

import { useActionState } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = { success: false, message: "" };

export function BillForm({
  title,
  action,
}: {
  title: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="size-4" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.message ? (
            <Alert variant={state.success ? "default" : "destructive"}>
              {state.success ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : null}
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="bill-description">Descrição</Label>
            <Input
              id="bill-description"
              name="description"
              placeholder="Ex.: aluguel, fornecedor, plano de saúde…"
              required
              maxLength={200}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="bill-amount">Valor (R$)</Label>
              <Input
                id="bill-amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bill-due">Vencimento</Label>
              <Input id="bill-due" name="dueDate" type="date" required />
            </div>
          </div>
          <Button disabled={pending} className="w-full">
            {pending ? "Salvando…" : "Adicionar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
