import { Plus } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { saveService, toggleService } from "@/modules/services/actions";

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
                <Plus className="size-4" /> Novo serviço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={saveService} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="durationMinutes">Minutos</Label>
                    <Input
                      id="durationMinutes"
                      name="durationMinutes"
                      type="number"
                      min="5"
                      step="5"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" name="description" rows={3} />
                </div>
                <Button className="w-full">Adicionar serviço</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
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
                          {item.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canManage ? (
                          <form action={toggleService}>
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
      </div>
    </>
  );
}
