"use client";

import { useActionState, useRef } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { createPayable } from "@/modules/bills/actions";
import { EXPENSE_CATEGORIES } from "@/lib/financial";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MaskedInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = { success: false, message: "" };

/**
 * Nova despesa progressiva (Fase 3 — item 3.5).
 *
 * A primeira linha pede só o que toda despesa tem: descrição, valor e
 * vencimento. Categoria e observação vivem atrás de "Adicionar detalhes",
 * fechado por padrão — lançar o aluguel do mês precisa custar três campos,
 * não sete. Antes este formulário era genérico e compartilhado com
 * "A receber", o que obrigava os dois lados a pedir o mesmo.
 */
export function ExpenseForm() {
  const [state, formAction, pending] = useActionState(
    createPayable,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="size-4" /> Nova despesa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          action={async (formData) => {
            await formAction(formData);
            formRef.current?.reset();
          }}
          className="space-y-4"
        >
          {state.message ? (
            <Alert variant={state.success ? "default" : "destructive"}>
              {state.success ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : null}
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="expense-description">O que foi</Label>
            <Input
              id="expense-description"
              name="description"
              placeholder="Ex.: aluguel de agosto"
              required
              maxLength={200}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Valor (R$)</Label>
              <MaskedInput
                mask="currency"
                id="expense-amount"
                name="amount"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-due">Vencimento</Label>
              <Input id="expense-due" name="dueDate" type="date" required />
            </div>
          </div>

          <details className="group">
            <summary className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer list-none items-center gap-1.5 text-sm transition-colors marker:content-none">
              <span className="transition-transform group-open:rotate-90">
                ›
              </span>
              Adicionar detalhes
            </summary>
            <div className="mt-3 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="expense-category">Categoria</Label>
                <select
                  id="expense-category"
                  name="category"
                  defaultValue=""
                  className="border-input bg-background h-10 w-full rounded-lg border px-2 text-sm"
                >
                  <option value="">Sem categoria</option>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <p className="text-muted-foreground text-xs">
                  A categoria é o que faz o relatório responder &ldquo;para onde
                  foi o dinheiro&rdquo;.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-notes">Observação</Label>
                <Textarea
                  id="expense-notes"
                  name="notes"
                  rows={2}
                  maxLength={500}
                  placeholder="Ex.: acertado com o fornecedor pagar em duas vezes"
                />
              </div>
            </div>
          </details>

          <Button disabled={pending} className="w-full">
            {pending ? "Salvando…" : "Lançar despesa"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
