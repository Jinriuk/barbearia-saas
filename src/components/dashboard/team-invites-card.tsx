import { MailCheck, MailX, RotateCw } from "lucide-react";
import { currentEpochMs, formatShortDateInTz } from "@/lib/dates";
import { resendTeamInvite, revokeTeamInvite } from "@/modules/team/invites";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type TeamInvite = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: "pending" | "accepted" | "revoked";
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
};

const roleLabels: Record<string, string> = {
  manager: "Gerente",
  receptionist: "Secretária",
  professional: "Profissional",
};

/**
 * Situação do convite (Fase 3 — item 3.8).
 *
 * Sem esta lista o dono manda o convite e fica no escuro: não sabe se
 * chegou, se foi aceito, nem se venceu. Reenviar e cancelar ficam ao lado
 * do estado, que é onde a pergunta aparece.
 */
export function TeamInvitesCard({
  invites,
  timezone,
}: {
  invites: TeamInvite[];
  timezone: string;
}) {
  if (!invites.length) return null;

  // Cada render no servidor é uma requisição nova (helper do projeto —
  // Date.now() direto no corpo do componente viola a regra de pureza).
  const now = currentEpochMs();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Convites</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {invites.map((invite) => {
          const expired =
            invite.status === "pending" &&
            new Date(invite.expiresAt).getTime() < now;
          return (
            <div
              key={invite.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{invite.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {invite.email} · {roleLabels[invite.role] ?? invite.role}
                </p>
              </div>

              {invite.status === "accepted" ? (
                <Badge className="border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <MailCheck className="size-3.5" /> Aceito
                  {invite.acceptedAt
                    ? ` em ${formatShortDateInTz(invite.acceptedAt, timezone)}`
                    : ""}
                </Badge>
              ) : invite.status === "revoked" ? (
                <Badge variant="secondary">
                  <MailX className="size-3.5" /> Cancelado
                </Badge>
              ) : expired ? (
                <Badge className="border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                  Venceu em {formatShortDateInTz(invite.expiresAt, timezone)}
                </Badge>
              ) : (
                <Badge variant="outline">
                  Aguardando resposta · vence em{" "}
                  {formatShortDateInTz(invite.expiresAt, timezone)}
                </Badge>
              )}

              {invite.status === "pending" ? (
                <div className="flex items-center gap-1.5">
                  <form action={resendTeamInvite}>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <Button size="sm" variant="outline">
                      <RotateCw className="size-3.5" /> Reenviar
                    </Button>
                  </form>
                  <form action={revokeTeamInvite}>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                    >
                      Cancelar
                    </Button>
                  </form>
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
