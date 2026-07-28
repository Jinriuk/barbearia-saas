"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { saveClient } from "@/modules/clients/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaskedInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActionToast } from "@/components/ui/toast";

export type ClientFormValues = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
};

const initialState: ActionState = { success: false, message: "" };

/**
 * Cadastro e edição de cliente. Sem `client` é um cadastro novo e os campos
 * são limpos a cada sucesso (uso típico da recepção); com `client` é uma
 * edição — um telefone digitado errado passa a ter conserto pela interface.
 */
export function ClientForm({
  client,
  onSaved,
}: {
  client?: ClientFormValues;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveClient, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  // Dentro do painel lateral a mensagem morreria com o fechamento (§5.7).
  useActionToast(state);

  useEffect(() => {
    if (!state.success) return;
    if (!client) formRef.current?.reset();
    onSaved?.();
    // Reage só ao resultado da ação, não à identidade do callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const fieldId = (name: string) =>
    client ? `client-${client.id}-${name}` : `client-new-${name}`;

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {client ? <input type="hidden" name="id" value={client.id} /> : null}
      {state.message ? (
        <Alert variant={state.success ? "success" : "destructive"}>
          {state.success ? (
            <CheckCircle2 className="text-success size-4" />
          ) : null}
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={fieldId("name")}>Nome</Label>
        <Input
          id={fieldId("name")}
          name="name"
          required
          defaultValue={client?.name ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={fieldId("phone")}>WhatsApp</Label>
        <MaskedInput
          mask="phone"
          id={fieldId("phone")}
          name="phone"
          placeholder="(11) 98765-4321"
          required
          defaultValue={client?.phone ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={fieldId("email")}>E-mail</Label>
        <Input
          id={fieldId("email")}
          name="email"
          type="email"
          defaultValue={client?.email ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={fieldId("notes")}>Observações internas</Label>
        <Textarea
          id={fieldId("notes")}
          name="notes"
          rows={3}
          placeholder="Preferências, alergias, combinados…"
          defaultValue={client?.notes ?? ""}
        />
      </div>
      <Button className="w-full" disabled={pending}>
        {client ? "Salvar cliente" : "Adicionar cliente"}
      </Button>
    </form>
  );
}
