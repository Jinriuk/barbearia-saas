"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { saveContactSettings } from "@/modules/settings/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = { success: false, message: "" };

export function ContactSettingsForm({
  initial,
}: {
  initial: {
    whatsappNumber: string;
    instagramUrl: string;
    address: string;
    whatsappRemindersEnabled: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState(
    saveContactSettings,
    initialState,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Contato e endereço</CardTitle>
        <p className="text-muted-foreground text-sm">
          Informações operacionais exibidas na sua página pública.
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-5 sm:grid-cols-2">
          {state.message ? (
            <div className="sm:col-span-2">
              <Alert variant={state.success ? "default" : "destructive"}>
                {state.success ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : null}
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">WhatsApp</Label>
            <Input
              id="whatsappNumber"
              name="whatsappNumber"
              defaultValue={initial.whatsappNumber}
              inputMode="tel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagramUrl">Instagram</Label>
            <Input
              id="instagramUrl"
              name="instagramUrl"
              type="url"
              defaultValue={initial.instagramUrl}
              placeholder="https://instagram.com/suabarbearia"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" name="address" defaultValue={initial.address} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="whatsappRemindersEnabled"
              defaultChecked={initial.whatsappRemindersEnabled}
              className="size-4 rounded border"
            />
            Enviar lembrete automático de horário por WhatsApp na véspera
          </label>
          <Button className="sm:w-fit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar contato"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
