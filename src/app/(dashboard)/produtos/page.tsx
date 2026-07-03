import { Plus, Sparkles } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { isPlus } from "@/lib/plans";
import { formatBRL } from "@/lib/financial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  deleteProduct,
  saveProduct,
  toggleProductActive,
  toggleProductVisible,
} from "@/modules/products/actions";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { DeleteEntityButton } from "@/components/dashboard/delete-entity-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ProductsPage() {
  const tenant = await requireTenant();
  const canManage = can(tenant.role, "catalog:manage");
  const plus = isPlus(tenant.plan);
  const supabase = await createSupabaseServerClient();
  const { data: productData } = await supabase
    .from("products")
    .select("id,name,description,sale_price,active,public_visible")
    .eq("barbershop_id", tenant.id)
    .order("name");
  const data = productData ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Loja"
        title="Produtos"
        description="Cadastre produtos de beleza para vender no balcão e oferecer no checkout do agendamento."
      />
      {!plus ? (
        <Alert className="mb-6">
          <Sparkles className="size-4" />
          <AlertDescription>
            O upsell de produtos no checkout é exclusivo do plano{" "}
            <strong>Plus</strong>. No Padrão você ainda gerencia o catálogo, mas
            ele não aparece no agendamento do cliente.
          </AlertDescription>
        </Alert>
      ) : null}
      <div
        className={
          canManage ? "grid gap-6 xl:grid-cols-[360px_1fr]" : "grid gap-6"
        }
      >
        {canManage ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="size-4" /> Novo produto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={saveProduct} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="salePrice">Preço de venda</Label>
                    <Input
                      id="salePrice"
                      name="salePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="costPrice">Custo (opcional)</Label>
                    <Input
                      id="costPrice"
                      name="costPrice"
                      type="number"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" name="description" rows={3} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="publicVisible"
                    defaultChecked
                    className="size-4 rounded border"
                  />
                  Oferecer no checkout (Plus)
                </label>
                <Button className="w-full">Adicionar produto</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catálogo</CardTitle>
          </CardHeader>
          <CardContent>
            {data.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Checkout</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-muted-foreground max-w-64 truncate text-xs">
                          {item.description || "Sem descrição"}
                        </p>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatBRL(Number(item.sale_price))}
                      </TableCell>
                      <TableCell>
                        {canManage ? (
                          <form action={toggleProductVisible}>
                            <input type="hidden" name="id" value={item.id} />
                            <input
                              type="hidden"
                              name="visible"
                              value={String(item.public_visible)}
                            />
                            <Button
                              size="sm"
                              variant={
                                item.public_visible ? "secondary" : "ghost"
                              }
                            >
                              {item.public_visible ? "No checkout" : "Oculto"}
                            </Button>
                          </form>
                        ) : (
                          <Badge
                            variant={
                              item.public_visible ? "secondary" : "outline"
                            }
                          >
                            {item.public_visible ? "No checkout" : "Oculto"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.active ? "default" : "secondary"}>
                          {item.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canManage ? (
                          <div className="flex items-center justify-end gap-1">
                            <form action={toggleProductActive}>
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
                              action={deleteProduct}
                              entityLabel="produto"
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
                title="Nenhum produto ainda"
                description="Cadastre produtos para vender no balcão e no checkout do agendamento."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
