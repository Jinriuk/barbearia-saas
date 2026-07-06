"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { changePassword } from "@/modules/account/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = { success: false, message: "" };

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePassword,
    initialState,
  );

  if (state.success) {
    return (
      <div className="space-y-5 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
        <p className="text-sm text-stone-300">
          Senha atualizada com sucesso. Você já pode voltar para o painel.
        </p>
        <Button asChild className="w-full">
          <Link href="/dashboard">
            Ir para o painel <ArrowRight />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirme a nova senha</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <Button className="w-full" disabled={pending}>
        {pending ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
