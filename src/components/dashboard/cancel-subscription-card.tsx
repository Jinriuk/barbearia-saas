"use client";

import { useActionState, useState } from "react";
import { CircleAlert, Undo2 } from "lucide-react";
import {
  requestCancellation,
  revokeCancellation,
} from "@/modules/subscription/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = { success: false, message: "" };

/**
 * Cancelamento do plano pela própria conta (Fase 0 §0.2).
 *
 * A comunicação prometia "cancele quando quiser" em cinco lugares e não havia
 * caminho nenhum. O cancelamento vale para o fim do período já pago — a
 * barbearia e a página pública dela continuam no ar até lá — e pode ser
 * desfeito enquanto isso.
 */
export function CancelSubscriptionCard({
  scheduled,
  endsAtLabel,
}: {
  scheduled: boolean;
  endsAtLabel: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [cancelState, cancelAction, cancelPending] = useActionState(
    requestCancellation,
    initialState,
  );
  const [revokeState, revokeAction, revokePending] = useActionState(
    revokeCancellation,
    initialState,
  );

  if (scheduled) {
    return (
      <Card className="border-warning/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleAlert className="size-4" /> Cancelamento agendado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm leading-6">
            {endsAtLabel
              ? `Seu plano será encerrado em ${endsAtLabel}. Até lá nada muda: o painel e a sua página de agendamento seguem no ar.`
              : "Seu plano será encerrado ao fim do período atual. Até lá nada muda."}
          </p>
          {revokeState.message ? (
            <Alert variant={revokeState.success ? "default" : "destructive"}>
              <AlertDescription>{revokeState.message}</AlertDescription>
            </Alert>
          ) : null}
          <form action={revokeAction}>
            <input type="hidden" name="intent" value="revoke" />
            <Button variant="outline" disabled={revokePending}>
              <Undo2 className="size-4" />
              {revokePending ? "Reativando…" : "Continuar com o plano"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cancelar meu plano</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm leading-6">
          Sem fidelidade e sem multa. O acesso continua até o fim do período já
          pago{endsAtLabel ? ` (${endsAtLabel})` : ""} — depois disso o painel e
          a sua página de agendamento saem do ar.
        </p>
        {cancelState.message ? (
          <Alert variant={cancelState.success ? "default" : "destructive"}>
            <AlertDescription>{cancelState.message}</AlertDescription>
          </Alert>
        ) : null}
        {open ? (
          <form action={cancelAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">
                O que faltou? <span className="font-normal">(opcional)</span>
              </Label>
              <Input
                id="reason"
                name="reason"
                maxLength={400}
                placeholder="Ajuda a gente a melhorar"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">
                Digite <strong>CANCELAR</strong> para confirmar
              </Label>
              <Input
                id="confirm"
                name="confirm"
                autoComplete="off"
                placeholder="CANCELAR"
                required
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" disabled={cancelPending}>
                {cancelPending ? "Cancelando…" : "Confirmar cancelamento"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Voltar
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" onClick={() => setOpen(true)}>
            Quero cancelar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
