import { Plus, UserRound } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteProfessional,
  saveProfessional,
  toggleProfessional,
} from "@/modules/professionals/actions";
import { DeleteEntityButton } from "@/components/dashboard/delete-entity-button";

export default async function ProfessionalsPage() {
  const tenant = await requireTenant();
  const canManage = can(tenant.role, "catalog:manage");
  const supabase = await createSupabaseServerClient();
  const { data: professionalData } = await supabase
    .from("professionals")
    .select("id,name,phone,bio,active")
    .eq("barbershop_id", tenant.id)
    .order("name");
  const data = professionalData ?? [];
  return (
    <>
      <PageHeader
        eyebrow="Equipe"
        title="Profissionais"
        description="Quem atende, o que executa e quando está disponível."
      />
      <div
        className={
          canManage ? "grid gap-6 xl:grid-cols-[360px_1fr]" : "grid gap-6"
        }
      >
        {canManage ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="size-4" /> Novo profissional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={saveProfessional} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" name="phone" inputMode="tel" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Apresentação pública</Label>
                  <Textarea id="bio" name="bio" rows={4} />
                </div>
                <Button className="w-full">Adicionar profissional</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
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
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.name}</p>
                      <Badge variant={item.active ? "default" : "secondary"}>
                        {item.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {item.phone || "Sem telefone"}
                    </p>
                    <p className="text-muted-foreground mt-3 line-clamp-2 text-sm">
                      {item.bio || "Sem apresentação pública."}
                    </p>
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
            description="Adicione o primeiro profissional para configurar serviços e horários."
          />
        )}
      </div>
    </>
  );
}
