"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { changePassword, updateProfile } from "@/modules/account/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = { success: false, message: "" };

function Feedback({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <Alert variant={state.success ? "default" : "destructive"}>
      {state.success ? (
        <CheckCircle2 className="size-4 text-emerald-600" />
      ) : null}
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}

export function ProfileForm({
  initial,
}: {
  initial: { name: string; phone: string; email: string };
}) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dados de perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <Feedback state={state} />
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={initial.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              name="phone"
              inputMode="tel"
              defaultValue={initial.phone}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={initial.email} disabled readOnly />
            <p className="text-muted-foreground text-xs">
              Para trocar o e-mail, fale com o suporte.
            </p>
          </div>
          <Button disabled={pending}>
            {pending ? "Salvando…" : "Salvar perfil"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePassword,
    initialState,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trocar senha</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <Feedback state={state} />
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
            <Label htmlFor="confirm">Confirmar nova senha</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <Button disabled={pending}>
            {pending ? "Alterando…" : "Alterar senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
