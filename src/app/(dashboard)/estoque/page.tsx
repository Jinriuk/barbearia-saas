import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { formatShortDateInTz, formatTimeInTz } from "@/lib/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { MOVEMENT_TYPES } from "@/lib/inventory";
import { InventoryMovementForm } from "@/components/dashboard/inventory-movement-form";
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

export default async function InventoryPage() {
  const tenant = await requireTenant();
  const canManage = can(tenant.role, "inventory:manage");

  if (!canManage) {
    return (
      <>
        <PageHeader
          eyebrow="Operação"
          title="Estoque"
          description="Saldo e movimentações dos produtos."
        />
        <EmptyState
          title="Acesso restrito"
          description="Apenas proprietário e gerente controlam o estoque."
        />
      </>
    );
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: productData }, { data: movementData }] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,minimum_stock,active")
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
  const lowStock = products.filter(
    (product) =>
      product.active &&
      (stockByProduct.get(product.id) ?? 0) < Number(product.minimum_stock),
  );

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Estoque"
        description="Registre entradas e saídas e acompanhe o saldo de cada produto."
      />
      {!products.length ? (
        <div className="space-y-4">
          <EmptyState
            title="Nenhum produto cadastrado"
            description="Cadastre os produtos primeiro para controlar o estoque."
          />
          <div className="text-center">
            <Button asChild>
              <Link href="/produtos">Ir para Produtos</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <InventoryMovementForm
            products={products
              .filter((product) => product.active)
              .map((product) => ({ id: product.id, name: product.name }))}
          />
          <div className="space-y-6">
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
                <CardTitle className="text-base">Saldo atual</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                      <TableHead className="text-right">Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const stock = stockByProduct.get(product.id) ?? 0;
                      const minimum = Number(product.minimum_stock);
                      const low = stock < minimum;
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            {product.name}
                            {!product.active ? (
                              <span className="text-muted-foreground ml-2 text-xs">
                                (inativo)
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {stock.toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-right font-mono">
                            {minimum.toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              className={
                                low
                                  ? "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                                  : "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                              }
                            >
                              {low ? "Repor" : "Ok"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Últimas movimentações
                </CardTitle>
              </CardHeader>
              <CardContent>
                {movements.length ? (
                  <div className="space-y-2">
                    {movements.slice(0, 15).map((movement) => {
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
        </div>
      )}
    </>
  );
}
