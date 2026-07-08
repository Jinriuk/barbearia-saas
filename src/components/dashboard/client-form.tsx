"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { saveClient } from "@/modules/clients/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = { success: false, message: "" };

/**
 * Formulário "Novo cliente" com feedback de sucesso/erro. Em sucesso, os
 * campos são limpos para o próximo cadastro (uso típico da recepção).
 */
export function ClientForm() {
  const [state, formAction, pending] = useActionState(
    saveClient,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.message ? (
        <Alert variant={state.success ? "default" : "destructive"}>
          {state.success ? (
            <CheckCircle2 className="size-4 text-emerald-600" />
          ) : null}
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" name="phone" inputMode="tel" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Observações internas</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>
      <Button className="w-full" disabled={pending}>
        Adicionar cliente
      </Button>
    </form>
  );
}
