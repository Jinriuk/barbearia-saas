import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
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
  const { data: serviceData } = await supabase
    .from("services")
    .select("id,name,description,price,duration_minutes,active")
    .eq("barbershop_id", tenant.id)
    .order("name");
  const data = serviceData ?? [];
  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Serviços"
        description="Preço, duração e disponibilidade pública de cada experiência."
        action={
          canManage ? (
            <div className="w-full sm:w-56">
              <ServiceFormSheet />
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
                      <p className="font-medium">{item.name}</p>
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
                      <Badge variant={item.active ? "default" : "secondary"}>
                        {item.active ? "Visível" : "Oculto"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage ? (
                        <div className="flex items-center justify-end gap-1">
                          <ServiceFormSheet service={item} />
                          <form action={toggleService}>
                            <input type="hidden" name="id" value={item.id} />
                            <input
                              type="hidden"
                              name="active"
                              value={String(item.active)}
                            />
                            <Button size="sm" variant="ghost">
                              {item.active ? "Ocultar" : "Exibir"}
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
