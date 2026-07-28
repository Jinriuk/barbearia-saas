import Link from "next/link";
import { Trash2, UserRound } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { SectionNav } from "@/components/layout/section-nav";
import { EmptyState } from "@/components/feedback/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ProfessionalProfileSheet } from "@/components/dashboard/professional-profile-sheet";
import {
  TeamInvitesCard,
  type TeamInvite,
} from "@/components/dashboard/team-invites-card";
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
  const [
    { data: professionalData },
    { data: serviceData },
    { data: memberData },
    { data: inviteData },
  ] = await Promise.all([
    supabase
      .from("professionals")
      .select("id,name,phone,bio,avatar_url,active,public_visible")
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
    canManageAccess
      ? supabase
          .from("team_invites")
          .select(
            "id,email,name,role,status,created_at,expires_at,accepted_at",
          )
          .eq("barbershop_id", tenant.id)
          .order("created_at", { ascending: false })
          .limit(50)
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
  const invites: TeamInvite[] = (inviteData ?? []).map((item) => ({
    id: item.id,
    email: item.email,
    name: item.name,
    role: item.role as string,
    status: item.status as TeamInvite["status"],
    createdAt: item.created_at,
    expiresAt: item.expires_at,
    acceptedAt: item.accepted_at ?? null,
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
                  {item.avatar_url ? (
                    <AvatarImage src={item.avatar_url} alt={item.name} />
                  ) : null}
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
                      <Badge variant="success">Disponível</Badge>
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
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {/* Perfil do profissional (Fase 3 — item 3.9): o G4 já
                        respondia "quanto deve receber"; a ficha é onde
                        aparece "quem produziu". */}
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/profissionais/${item.id}`}>Ver ficha</Link>
                    </Button>
                    {canManageAccess ? (
                      <ProfessionalProfileSheet
                        professional={{
                          id: item.id,
                          name: item.name,
                          bio: item.bio,
                          avatarUrl: item.avatar_url,
                        }}
                      />
                    ) : null}
                    {canSetAvailability && item.active ? (
                      <form action={setProfessionalAvailability}>
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
      {/* O convite vive na aba "Profissionais" e cobre todos os papéis
          (Fase 3 — item 3.8). Aqui fica o acompanhamento: quem já entrou e
          quem ainda não respondeu. */}
      <TeamInvitesCard invites={invites} timezone={tenant.timezone} />
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
                          className="border-border-control bg-field focus-visible:border-focus-ring focus-visible:ring-focus-ring/45 h-12 rounded-lg border px-3 text-sm transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:h-11"
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
                          className="text-destructive hover:text-destructive/85"
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
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">O que cada papel pode</CardTitle>
          <Button asChild size="sm" variant="ghost">
            <Link href="/permissoes">Ver matriz completa</Link>
          </Button>
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
      <SectionNav section="equipe" role={tenant.role} />
      {canManageAccess ? (
        <TeamTabs professionals={professionalsSection} access={accessSection} />
      ) : (
        professionalsSection
      )}
    </>
  );
}
