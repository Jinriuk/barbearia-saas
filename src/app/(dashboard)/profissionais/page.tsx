import { Trash2, UserRound } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteProfessional,
  setProfessionalAvailability,
  toggleProfessional,
} from "@/modules/professionals/actions";
import { changeMemberRole, removeMember } from "@/modules/team/actions";
import { DeleteEntityButton } from "@/components/dashboard/delete-entity-button";
import { ProfessionalForm } from "@/components/dashboard/professional-form";
import { InviteMemberForm } from "@/components/dashboard/invite-member-form";
import { TeamTabs } from "@/components/dashboard/team-tabs";

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  manager: "Gerente",
  receptionist: "Secretária",
  professional: "Profissional",
  client: "Cliente",
};

const editableRoles = ["manager", "receptionist", "professional"] as const;

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function ProfessionalsPage() {
  const tenant = await requireTenant();
  const canManage = can(tenant.role, "catalog:manage");
  const canManageAccess = can(tenant.role, "memberships:manage");
  const canSetAvailability =
    tenant.role === "owner" ||
    tenant.role === "manager" ||
    tenant.role === "receptionist";
  const supabase = await createSupabaseServerClient();
  const [{ data: professionalData }, { data: serviceData }, { data: memberData }] =
    await Promise.all([
      supabase
        .from("professionals")
        .select("id,name,phone,bio,active,public_visible")
        .eq("barbershop_id", tenant.id)
        .order("name"),
      supabase
        .from("services")
        .select("id,name")
        .eq("barbershop_id", tenant.id)
        .eq("active", true)
        .order("name"),
      canManageAccess
        ? supabase
            .from("memberships")
            .select("id,role,status,created_at,profile:profiles(id,name,phone)")
            .eq("barbershop_id", tenant.id)
            .eq("status", "active")
            .order("created_at")
        : Promise.resolve({ data: [] as never[] }),
    ]);
  const data = professionalData ?? [];
  const services = serviceData ?? [];
  const members = (memberData ?? []).map((item) => ({
    id: item.id,
    role: item.role as string,
    name: first(item.profile)?.name ?? "Sem perfil",
    phone: first(item.profile)?.phone ?? "",
  }));

  const professionalsSection = (
    <div
      className={
        canManageAccess ? "grid gap-6 xl:grid-cols-[380px_1fr]" : "grid gap-6"
      }
    >
      {canManageAccess ? <ProfessionalForm services={services} /> : null}
      {data.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-start gap-4 pt-6">
                <Avatar className="size-11">
                  <AvatarFallback>
                    <UserRound className="size-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.name}</p>
                    {!item.active ? (
                      <Badge variant="secondary">Inativo</Badge>
                    ) : item.public_visible ? (
                      <Badge className="border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                        Disponível
                      </Badge>
                    ) : (
                      <Badge variant="outline">Indisponível</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {item.phone || "Sem telefone"}
                  </p>
                  <p className="text-muted-foreground mt-3 line-clamp-2 text-sm">
                    {item.bio || "Sem apresentação pública."}
                  </p>
                  {canSetAvailability && item.active ? (
                    <form action={setProfessionalAvailability} className="mt-3">
                      <input type="hidden" name="id" value={item.id} />
                      <input
                        type="hidden"
                        name="available"
                        value={String(item.public_visible)}
                      />
                      <Button size="sm" variant="outline">
                        {item.public_visible
                          ? "Marcar indisponível"
                          : "Marcar disponível"}
                      </Button>
                    </form>
                  ) : null}
                </div>
                {canManage ? (
                  <div className="flex items-center gap-1">
                    <form action={toggleProfessional}>
                      <input type="hidden" name="id" value={item.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={String(item.active)}
                      />
                      <Button size="sm" variant="ghost">
                        {item.active ? "Desativar" : "Ativar"}
                      </Button>
                    </form>
                    <DeleteEntityButton
                      id={item.id}
                      action={deleteProfessional}
                      entityLabel="profissional"
                      itemName={item.name}
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Sua equipe aparece aqui"
          description="Adicione o primeiro profissional para configurar serviços, acesso e horários."
        />
      )}
    </div>
  );

  const accessSection = (
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
            <span className="text-foreground font-medium">Secretária</span> —
            agenda e clientes.
          </p>
          <p>
            <span className="text-foreground font-medium">Profissional</span> —
            vê a própria agenda no painel.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow="Equipe"
        title="Profissionais e Equipe"
        description="Quem atende, o que executa, a disponibilidade e o acesso ao sistema."
      />
      {canManageAccess ? (
        <TeamTabs professionals={professionalsSection} access={accessSection} />
      ) : (
        professionalsSection
      )}
    </>
  );
}
