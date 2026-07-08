"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, UserPlus } from "lucide-react";
import { createProfessionalWithAccess } from "@/modules/professionals/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = { success: false, message: "" };

export function ProfessionalForm({
  services,
}: {
  services: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(
    createProfessionalWithAccess,
    initialState,
  );
  const [role, setRole] = useState("professional");
  const isProfessional = role === "professional";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="size-4" /> Novo profissional
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4" key={state.success ? "ok" : "form"}>
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail de acesso</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha inicial</Label>
              <Input
                id="password"
                name="password"
                type="text"
                minLength={6}
                placeholder="mín. 6 caracteres"
                required
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" inputMode="tel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <select
                id="role"
                name="role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              >
                <option value="professional">Profissional</option>
                <option value="receptionist">Secretária</option>
                <option value="manager">Gerente</option>
              </select>
            </div>
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

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="available"
              defaultChecked
              className="size-4 rounded border"
            />
            Disponível para novos agendamentos
          </label>
          </>
          ) : null}

          <Button disabled={pending} className="w-full">
            {pending
              ? "Criando acesso…"
              : isProfessional
                ? "Criar profissional e acesso"
                : "Criar acesso"}
          </Button>
          <p className="text-muted-foreground text-xs">
            {isProfessional
              ? "O profissional entra em /login com o e-mail e a senha definidos e vê apenas a própria agenda."
              : "O membro entra em /login com o e-mail e a senha definidos, conforme as permissões do papel."}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
