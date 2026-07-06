import { Trash2 } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { changeMemberRole, removeMember } from "@/modules/team/actions";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { InviteMemberForm } from "@/components/dashboard/invite-member-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  manager: "Gerente",
  receptionist: "Recepcionista",
  professional: "Profissional",
  client: "Cliente",
};

const editableRoles = ["manager", "receptionist", "professional"] as const;

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function TeamPage() {
  const tenant = await requireTenant();
  const canManage = can(tenant.role, "memberships:manage");

  if (!canManage) {
    return (
      <>
        <PageHeader
          eyebrow="Equipe"
          title="Equipe"
          description="Quem tem acesso ao painel da barbearia."
        />
        <EmptyState
          title="Acesso restrito"
          description="Apenas o proprietário pode gerenciar a equipe."
        />
      </>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("memberships")
    .select("id,role,status,created_at,profile:profiles(id,name,phone)")
    .eq("barbershop_id", tenant.id)
    .eq("status", "active")
    .order("created_at");

  const members = (data ?? []).map((item) => ({
    id: item.id,
    role: item.role as string,
    name: first(item.profile)?.name ?? "Sem perfil",
    phone: first(item.profile)?.phone ?? "",
  }));

  return (
    <>
      <PageHeader
        eyebrow="Equipe"
        title="Equipe"
        description="Convide funcionários e controle o que cada papel pode fazer."
      />
      <div className="max-w-5xl space-y-6">
        <InviteMemberForm />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Membros ativos ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => {
              const isOwner = member.role === "owner";
              return (
                <div
                  key={member.id}
                  className="grid items-center gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {member.phone || roleLabels[member.role] || member.role}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isOwner ? (
                      <Badge className="bg-primary/10 text-primary border-transparent">
                        {roleLabels.owner}
                      </Badge>
                    ) : (
                      <>
                        <form
                          action={changeMemberRole}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="hidden"
                            name="membershipId"
                            value={member.id}
                          />
                          <select
                            name="role"
                            defaultValue={member.role}
                            aria-label={`Papel de ${member.name}`}
                            className="border-input bg-background h-8 rounded-md border px-2 text-sm"
                          >
                            {editableRoles.map((role) => (
                              <option key={role} value={role}>
                                {roleLabels[role]}
                              </option>
                            ))}
                          </select>
                          <Button size="sm" variant="outline">
                            Salvar
                          </Button>
                        </form>
                        <form action={removeMember}>
                          <input
                            type="hidden"
                            name="membershipId"
                            value={member.id}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                            aria-label={`Remover ${member.name}`}
                          >
                            <Trash2 className="size-3.5" /> Remover
                          </Button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">O que cada papel pode</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground grid gap-3 text-sm sm:grid-cols-3">
            <p>
              <span className="text-foreground font-medium">Gerente</span> —
              agenda, clientes, catálogo, estoque e relatórios.
            </p>
            <p>
              <span className="text-foreground font-medium">Recepcionista</span>{" "}
              — agenda e clientes.
            </p>
            <p>
              <span className="text-foreground font-medium">Profissional</span>{" "}
              — vê a própria agenda no painel.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
