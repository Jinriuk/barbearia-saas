import { AlertTriangle, Boxes, Package, Sparkles, Wallet } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { isPlus } from "@/lib/plans";
import { formatBRL } from "@/lib/financial";
import { formatShortDateInTz, formatTimeInTz } from "@/lib/dates";
import { MOVEMENT_TYPES } from "@/lib/inventory";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  deleteProduct,
  toggleProductActive,
  toggleProductVisible,
} from "@/modules/products/actions";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { DeleteEntityButton } from "@/components/dashboard/delete-entity-button";
import { ProductFormSheet } from "@/components/dashboard/product-form-sheet";
import { InventoryMovementForm } from "@/components/dashboard/inventory-movement-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const IN_TYPES = new Set(["purchase", "adjustment_in", "return"]);

const typeLabels: Record<string, string> = Object.fromEntries(
  MOVEMENT_TYPES.map((type) => [type.value, type.label]),
);

export default async function ProductsPage() {
  const tenant = await requireTenant();
  const canCatalog = can(tenant.role, "catalog:manage");
  const canInventory = can(tenant.role, "inventory:manage");
  const plus = isPlus(tenant.plan);
  const supabase = await createSupabaseServerClient();

  const [{ data: productData }, { data: movementData }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id,name,description,sale_price,cost_price,minimum_stock,active,public_visible",
      )
      .eq("barbershop_id", tenant.id)
      .order("name"),
    supabase
      .from("inventory_movements")
      .select("id,product_id,type,quantity,reason,created_at")
      .eq("barbershop_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(400),
  ]);

  const products = productData ?? [];
  const movements = movementData ?? [];

  const stockByProduct = new Map<string, number>();
  for (const movement of movements) {
    const signal = IN_TYPES.has(movement.type) ? 1 : -1;
    stockByProduct.set(
      movement.product_id,
      (stockByProduct.get(movement.product_id) ?? 0) +
        signal * Number(movement.quantity),
    );
  }
  const productNames = new Map(products.map((item) => [item.id, item.name]));

  const stockOf = (id: string) => stockByProduct.get(id) ?? 0;
  const activeProducts = products.filter((product) => product.active);
  const totalUnits = activeProducts.reduce(
    (total, product) => total + stockOf(product.id),
    0,
  );
  const stockValue = activeProducts.reduce(
    (total, product) => total + stockOf(product.id) * Number(product.sale_price),
    0,
  );
  const lowStock = activeProducts.filter(
    (product) => stockOf(product.id) < Number(product.minimum_stock),
  );

  const totals = [
    {
      label: "Produtos ativos",
      value: String(activeProducts.length),
      icon: Package,
    },
    {
      label: "Unidades em estoque",
      value: totalUnits.toLocaleString("pt-BR"),
      icon: Boxes,
    },
    {
      label: "Valor estimado",
      value: formatBRL(stockValue),
      icon: Wallet,
    },
    {
      label: "Baixo estoque",
      value: String(lowStock.length),
      icon: AlertTriangle,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Loja"
        title="Produtos e Estoque"
        description="Catálogo, saldo, reservas e movimentações num só lugar."
        action={
          canCatalog ? (
            <div className="w-full sm:w-56">
              <ProductFormSheet />
            </div>
          ) : undefined
        }
      />

      {!plus ? (
        <Alert className="mb-6">
          <Sparkles className="size-4" />
          <AlertDescription>
            O upsell de produtos no checkout é exclusivo do plano{" "}
            <strong>Plus</strong>. No Padrão você ainda gerencia o catálogo e o
            estoque, mas ele não aparece no agendamento do cliente.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {totals.map((total) => (
          <Card key={total.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {total.label}
              </CardTitle>
              <total.icon className="text-primary size-4" />
            </CardHeader>
            <CardContent>
              <p className="font-mono text-2xl font-semibold">{total.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!products.length ? (
        <EmptyState
          title="Nenhum produto ainda"
          description="Cadastre produtos para vender no balcão e no checkout do agendamento."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Catálogo e saldo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-right">Reservado</TableHead>
                      <TableHead className="text-right">Disponível</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const stock = stockOf(product.id);
                      // Reservas ainda não têm tabela dedicada — exibimos 0 e
                      // disponível = estoque até a fase de reservas/vendas.
                      const reserved = 0;
                      const available = stock - reserved;
                      const low =
                        product.active &&
                        stock < Number(product.minimum_stock);
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-muted-foreground max-w-64 truncate text-xs">
                              {product.description || "Sem descrição"}
                            </p>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatBRL(Number(product.sale_price))}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <span className={low ? "text-amber-600" : ""}>
                              {stock.toLocaleString("pt-BR")}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-right font-mono">
                            {reserved.toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {available.toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Badge
                                variant={product.active ? "default" : "secondary"}
                              >
                                {product.active ? "Ativo" : "Oculto"}
                              </Badge>
                              {product.public_visible ? (
                                <Badge variant="outline">Checkout</Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {canCatalog ? (
                              <div className="flex items-center justify-end gap-1">
                                <ProductFormSheet product={product} />
                                <form action={toggleProductVisible}>
                                  <input
                                    type="hidden"
                                    name="id"
                                    value={product.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="visible"
                                    value={String(product.public_visible)}
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    aria-label="Alternar checkout"
                                  >
                                    {product.public_visible
                                      ? "Tirar do checkout"
                                      : "No checkout"}
                                  </Button>
                                </form>
                                <form action={toggleProductActive}>
                                  <input
                                    type="hidden"
                                    name="id"
                                    value={product.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="active"
                                    value={String(product.active)}
                                  />
                                  <Button size="sm" variant="ghost">
                                    {product.active ? "Ocultar" : "Exibir"}
                                  </Button>
                                </form>
                                <DeleteEntityButton
                                  id={product.id}
                                  action={deleteProduct}
                                  entityLabel="produto"
                                  itemName={product.name}
                                />
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {canInventory ? (
            <div className="space-y-6">
              <InventoryMovementForm
                products={activeProducts.map((product) => ({
                  id: product.id,
                  name: product.name,
                }))}
              />
              {lowStock.length ? (
                <Card className="border-amber-300 dark:border-amber-900">
                  <CardContent className="flex items-center gap-3 pt-6 text-sm">
                    <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                    <span>
                      <strong>{lowStock.length}</strong> produto(s) abaixo do
                      estoque mínimo:{" "}
                      {lowStock.map((product) => product.name).join(", ")}.
                    </span>
                  </CardContent>
                </Card>
              ) : null}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Últimas movimentações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {movements.length ? (
                    <div className="space-y-2">
                      {movements.slice(0, 12).map((movement) => {
                        const isIn = IN_TYPES.has(movement.type);
                        return (
                          <div
                            key={movement.id}
                            className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm"
                          >
                            <span
                              className={`font-mono ${isIn ? "text-emerald-600" : "text-rose-600"}`}
                            >
                              {isIn ? "+" : "−"}
                              {Number(movement.quantity).toLocaleString("pt-BR")}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">
                                {productNames.get(movement.product_id) ??
                                  "Produto"}
                              </p>
                              <p className="text-muted-foreground truncate text-xs">
                                {typeLabels[movement.type] ?? movement.type}
                                {movement.reason ? ` · ${movement.reason}` : ""}
                              </p>
                            </div>
                            <span className="text-muted-foreground shrink-0 text-xs">
                              {formatShortDateInTz(
                                movement.created_at,
                                tenant.timezone,
                              )}{" "}
                              {formatTimeInTz(
                                movement.created_at,
                                tenant.timezone,
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground py-6 text-center text-sm">
                      Nenhuma movimentação registrada ainda.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
