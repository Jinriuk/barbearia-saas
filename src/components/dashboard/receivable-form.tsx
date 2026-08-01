"use client";

import { useActionState, useRef } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { createReceivable } from "@/modules/bills/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MaskedInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = { success: false, message: "" };

export type ReceivableClientOption = { id: string; name: string };

/**
 * Novo valor a receber (Fase 3 — item 3.6): fiado com dono.
 *
 * Sem o cliente vinculado, "A receber" é uma lista de dívidas sem devedor —
 * ninguém consegue cobrar. Com ele, a linha ganha o botão "Cobrar no
 * WhatsApp" e o histórico do cliente passa a saber que existe conta aberta.
 */
export function ReceivableForm({
  clients,
}: {
  clients: ReceivableClientOption[];
}) {
  const [state, formAction, pending] = useActionState(
    createReceivable,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="size-4" /> Novo valor a receber
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
            <Label htmlFor="receivable-client">De quem</Label>
            <select
              id="receivable-client"
              name="clientId"
              defaultValue=""
              className="border-input bg-background h-10 w-full rounded-lg border px-2 text-sm"
            >
              <option value="">Sem cliente vinculado</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground text-xs">
              Com o cliente vinculado você cobra pelo WhatsApp direto da lista.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receivable-description">Referente a</Label>
            <Input
              id="receivable-description"
              name="description"
              placeholder="Ex.: corte e barba fiado"
              required
              maxLength={200}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="receivable-amount">Valor (R$)</Label>
              <MaskedInput
                mask="currency"
                id="receivable-amount"
                name="amount"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receivable-due">Vencimento</Label>
              <Input id="receivable-due" name="dueDate" type="date" required />
            </div>
          </div>

          <details className="group">
            <summary className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer list-none items-center gap-1.5 text-sm transition-colors marker:content-none">
              <span className="transition-transform group-open:rotate-90">
                ›
              </span>
              Adicionar detalhes
            </summary>
            <div className="mt-3 space-y-2">
              <Label htmlFor="receivable-notes">Observação</Label>
              <Textarea
                id="receivable-notes"
                name="notes"
                rows={2}
                maxLength={500}
                placeholder="Ex.: combinou pagar no dia 10"
              />
            </div>
          </details>

          <Button disabled={pending} className="w-full">
            {pending ? "Salvando…" : "Lançar a receber"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
