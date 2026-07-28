"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, MailPlus } from "lucide-react";
import { sendTeamInvite } from "@/modules/team/invites";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MaskedInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = { success: false, message: "" };

/**
 * Convite de colaborador (Fase 3 — item 3.8).
 *
 * O formulário perdeu o campo "senha inicial". O §7.7 é categórico: o dono
 * não deve criar a senha do colaborador. Ela chega por e-mail e a pessoa
 * escolhe a própria — o dono nunca a conhece.
 */
export function ProfessionalForm({
  services,
}: {
  services: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    sendTeamInvite,
    initialState,
  );
  const [role, setRole] = useState("professional");
  const isProfessional = role === "professional";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MailPlus className="size-4" /> Convidar para a equipe
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          A pessoa recebe um e-mail, define a própria senha e entra. Você não
          precisa criar nem guardar senha de ninguém.
        </p>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          className="space-y-4"
          key={state.success ? "ok" : "form"}
        >
          {state.message ? (
            <Alert variant={state.success ? "success" : "destructive"}>
              {state.success ? (
                <CheckCircle2 className="text-success size-4" />
              ) : null}
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <MaskedInput
                mask="phone"
                id="phone"
                name="phone"
                placeholder="(11) 98765-4321"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Função</Label>
            <select
              id="role"
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="border-border-control bg-field focus-visible:border-focus-ring focus-visible:ring-focus-ring/45 h-12 w-full rounded-lg border px-3 text-sm transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:h-11"
            >
              <option value="professional">Profissional</option>
              <option value="receptionist">Secretária</option>
              <option value="manager">Gerente</option>
            </select>
          </div>

          {isProfessional ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="commissionRate">Comissão (%)</Label>
                  <Input
                    id="commissionRate"
                    name="commissionRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    defaultValue="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseSalary">Salário fixo (R$)</Label>
                  <Input
                    id="baseSalary"
                    name="baseSalary"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue="0"
                  />
                </div>
              </div>

              {services.length ? (
                <div className="space-y-2">
                  <Label>Serviços que realiza</Label>
                  <div className="grid max-h-40 gap-1.5 overflow-y-auto rounded-lg border p-3">
                    {services.map((service) => (
                      <label
                        key={service.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          name="serviceIds"
                          value={service.id}
                          defaultChecked
                          className="size-4 rounded border"
                        />
                        {service.name}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          <Button disabled={pending} className="w-full">
            {pending ? "Enviando convite…" : "Enviar convite"}
          </Button>
          <p className="text-muted-foreground text-xs">
            {isProfessional
              ? "Ao aceitar, a ficha do profissional é criada com os serviços marcados e o expediente padrão de segunda a sábado, das 9h às 18h."
              : "Ao aceitar, a pessoa passa a acessar o painel conforme as permissões do papel."}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
