"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  saveProfessionalDetails,
  saveProfessionalServices,
} from "@/modules/professionals/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = { success: false, message: "" };

/** Aba "Dados" da ficha do profissional (Fase 3 — item 3.9). */
export function ProfessionalDetailsForm({
  professional,
}: {
  professional: {
    id: string;
    name: string;
    phone: string | null;
    bio: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(
    saveProfessionalDetails,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dados da pessoa</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="max-w-xl space-y-4">
          <input type="hidden" name="id" value={professional.id} />
          {state.message ? (
            <Alert variant={state.success ? "default" : "destructive"}>
              {state.success ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : null}
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pro-name">Nome</Label>
              <Input
                id="pro-name"
                name="name"
                defaultValue={professional.name}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pro-phone">Telefone</Label>
              <Input
                id="pro-phone"
                name="phone"
                inputMode="tel"
                defaultValue={professional.phone ?? ""}
                maxLength={30}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pro-bio">Apresentação pública</Label>
            <Textarea
              id="pro-bio"
              name="bio"
              rows={3}
              maxLength={200}
              defaultValue={professional.bio ?? ""}
              placeholder="Ex.: especialista em degradê e barba desenhada."
            />
            <p className="text-muted-foreground text-xs">
              Aparece na sua página de agendamento, junto da foto.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pro-avatar">Escolher foto</Label>
            <Input
              id="pro-avatar"
              name="avatar"
              type="file"
              accept="image/*"
              className="h-auto py-2"
            />
          </div>

          <Button disabled={pending}>
            {pending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Aba "Serviços e comissões" — a parte de quais serviços a pessoa executa. */
export function ProfessionalServicesForm({
  professionalId,
  services,
  selectedIds,
}: {
  professionalId: string;
  services: Array<{ id: string; name: string; commissionRate: number }>;
  selectedIds: string[];
}) {
  const [state, formAction, pending] = useActionState(
    saveProfessionalServices,
    initialState,
  );
  const selected = new Set(selectedIds);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Serviços que executa</CardTitle>
        <p className="text-muted-foreground text-sm">
          Só os marcados aparecem para o cliente escolher na página de
          agendamento.
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={professionalId} />
          {state.message ? (
            <Alert variant={state.success ? "default" : "destructive"}>
              {state.success ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : null}
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          {services.length ? (
            <div className="grid max-h-80 gap-1.5 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
              {services.map((service) => (
                <label
                  key={service.id}
                  className="flex items-center gap-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    name="serviceIds"
                    value={service.id}
                    defaultChecked={selected.has(service.id)}
                    className="size-4 rounded border"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {service.name}
                  </span>
                  {service.commissionRate > 0 ? (
                    <span className="text-muted-foreground shrink-0 font-mono text-xs">
                      {service.commissionRate}%
                    </span>
                  ) : null}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Nenhum serviço ativo no catálogo ainda.
            </p>
          )}

          <Button disabled={pending}>
            {pending ? "Salvando…" : "Salvar serviços"}
          </Button>
          <p className="text-muted-foreground text-xs">
            A porcentagem ao lado é a comissão específica do serviço, que tem
            precedência sobre a comissão padrão desta pessoa. Ela é editada no
            catálogo, em Serviços.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
