import { UserRound } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  deleteProfessional,
  setProfessionalAvailability,
  toggleProfessional,
} from "@/modules/professionals/actions";
import { DeleteEntityButton } from "@/components/dashboard/delete-entity-button";
import { ProfessionalForm } from "@/components/dashboard/professional-form";

export default async function ProfessionalsPage() {
  const tenant = await requireTenant();
  const canManage = can(tenant.role, "catalog:manage");
  const canCreateAccess = can(tenant.role, "memberships:manage");
  const canSetAvailability =
    tenant.role === "owner" ||
    tenant.role === "manager" ||
    tenant.role === "receptionist";
  const supabase = await createSupabaseServerClient();
  const [{ data: professionalData }, { data: serviceData }] = await Promise.all([
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
  ]);
  const data = professionalData ?? [];
  const services = serviceData ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Equipe"
        title="Profissionais"
        description="Quem atende, o que executa, a disponibilidade e o acesso ao sistema."
      />
      <div
        className={
          canCreateAccess ? "grid gap-6 xl:grid-cols-[380px_1fr]" : "grid gap-6"
        }
      >
        {canCreateAccess ? <ProfessionalForm services={services} /> : null}
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
                      <form
                        action={setProfessionalAvailability}
                        className="mt-3"
                      >
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
    </>
  );
}
