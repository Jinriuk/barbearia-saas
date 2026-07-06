"use client";

import { useActionState } from "react";
import { CheckCircle2, UserPlus } from "lucide-react";
import { inviteMember } from "@/modules/team/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: ActionState = { success: false, message: "" };

export function InviteMemberForm() {
  const [state, formAction, pending] = useActionState(
    inviteMember,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="size-4" /> Convidar para a equipe
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          A pessoa precisa ter uma conta criada com esse e-mail. Ela passa a
          acessar o painel com o papel escolhido.
        </p>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          className="grid gap-4 sm:grid-cols-[1fr_220px_auto]"
        >
          {state.message ? (
            <Alert
              variant={state.success ? "default" : "destructive"}
              className="sm:col-span-3"
            >
              {state.success ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : null}
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="invite-email">E-mail</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              placeholder="pessoa@exemplo.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Papel</Label>
            <Select name="role" defaultValue="receptionist">
              <SelectTrigger aria-label="Papel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Gerente</SelectItem>
                <SelectItem value="receptionist">Recepcionista</SelectItem>
                <SelectItem value="professional">Profissional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button disabled={pending} className="w-full sm:w-auto">
              {pending ? "Convidando…" : "Convidar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
