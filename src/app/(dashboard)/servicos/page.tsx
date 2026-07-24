import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteService, toggleService } from "@/modules/services/actions";
import { DeleteEntityButton } from "@/components/dashboard/delete-entity-button";
import { ServiceFormSheet } from "@/components/dashboard/service-form-sheet";

export default async function ServicesPage() {
  const tenant = await requireTenant();
  const canManage = can(tenant.role, "catalog:manage");
  const supabase = await createSupabaseServerClient();
  const [
    { data: serviceData },
    { data: professionalData },
    { data: linkData },
  ] = await Promise.all([
    supabase
      .from("services")
      .select(
        "id,name,description,price,duration_minutes,active,category,image_url,audience,return_days",
      )
      .eq("barbershop_id", tenant.id)
      .order("name"),
    supabase
      .from("professionals")
      .select("id,name")
      .eq("barbershop_id", tenant.id)
      .eq("active", true)
      .order("name"),
    supabase
      .from("professional_services")
      .select("service_id,professional_id")
      .eq("barbershop_id", tenant.id),
  ]);
  const professionals = professionalData ?? [];
  const linksByService = new Map<string, string[]>();
  for (const link of linkData ?? []) {
    const list = linksByService.get(link.service_id) ?? [];
    list.push(link.professional_id);
    linksByService.set(link.service_id, list);
  }
  const data = (serviceData ?? []).map((item) => ({
    ...item,
    professionalIds: linksByService.get(item.id) ?? [],
  }));
  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Serviços"
        description="Preço, duração e disponibilidade pública de cada experiência."
        action={
          canManage ? (
            <div className="w-full sm:w-56">
              <ServiceFormSheet professionals={professionals} />
            </div>
          ) : undefined
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catálogo atual</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.name}</p>
                        {item.category ? (
                          <Badge variant="outline">{item.category}</Badge>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground max-w-72 truncate text-xs">
                        {item.description || "Sem descrição"}
                      </p>
                    </TableCell>
                    <TableCell>{item.duration_minutes} min</TableCell>
                    <TableCell>
                      R${" "}
                      {Number(item.price).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.active ? "default" : "secondary"}>
                          {item.active ? "Visível" : "Oculto"}
                        </Badge>
                        {item.audience === "members" ? (
                          <Badge variant="outline">Assinantes</Badge>
                        ) : null}
                        {item.audience === "internal" ? (
                          <Badge variant="outline">Interno</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage ? (
                        <div className="flex items-center justify-end gap-1">
                          <ServiceFormSheet
                            service={item}
                            professionals={professionals}
                          />
                          <form action={toggleService}>
                            <input type="hidden" name="id" value={item.id} />
                            <input
                              type="hidden"
                              name="active"
                              value={String(item.active)}
                            />
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-foreground"
                              title={
                                item.active
                                  ? "Ocultar serviço"
                                  : "Exibir serviço"
                              }
                              aria-label={
                                item.active
                                  ? "Ocultar serviço"
                                  : "Exibir serviço"
                              }
                            >
                              {item.active ? (
                                <Eye className="size-4" />
                              ) : (
                                <EyeOff className="size-4" />
                              )}
                            </Button>
                          </form>
                          <DeleteEntityButton
                            id={item.id}
                            action={deleteService}
                            entityLabel="serviço"
                            itemName={item.name}
                          />
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="Nenhum serviço ainda"
              description="Cadastre o primeiro serviço para liberar agenda e página pública."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
