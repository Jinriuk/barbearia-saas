import Link from "next/link";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { formatBRL } from "@/lib/financial";
import { formatShortDateInTz, getUtcDayRange } from "@/lib/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import {
  CounterSaleForm,
  type SaleProduct,
} from "@/components/dashboard/counter-sale-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewSalePage() {
  const tenant = await requireTenant();
  if (!can(tenant.role, "inventory:manage")) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  const { start: dayStart, end: dayEnd } = getUtcDayRange(tenant.timezone);

  const [
    { data: productData },
    { data: stockData },
    { data: topData },
    { data: clientData },
    { data: professionalData },
    { data: todaySales },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,sale_price,image_url")
      .eq("barbershop_id", tenant.id)
      .eq("active", true)
      .order("name"),
    supabase.rpc("get_product_stock", { p_barbershop: tenant.id }),
    supabase.rpc("get_top_products", { p_barbershop: tenant.id, p_limit: 6 }),
    supabase
      .from("clients")
      .select("id,name,phone")
      .eq("barbershop_id", tenant.id)
      .eq("active", true)
      .order("name")
      .limit(400),
    supabase
      .from("professionals")
      .select("id,name")
      .eq("barbershop_id", tenant.id)
      .eq("active", true)
      .order("name"),
    supabase
      .from("counter_sales")
      .select(
        "id,total,discount,payment_method,created_at,client:clients(name),professional:professionals(name)",
      )
      .eq("barbershop_id", tenant.id)
      .gte("created_at", dayStart.toISOString())
      .lt("created_at", dayEnd.toISOString())
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const stockByProduct = new Map(
    (
      (stockData ?? []) as Array<{
        product_id: string;
        balance: number;
        reserved: number;
      }>
    ).map((row) => [
      row.product_id,
      Number(row.balance) - Number(row.reserved),
    ]),
  );

  // O que já está reservado num agendamento não pode ser vendido de novo no
  // balcão — "disponível" é saldo menos reserva.
  const products: SaleProduct[] = (productData ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    price: Number(product.sale_price),
    available: Math.max(stockByProduct.get(product.id) ?? 0, 0),
    imageUrl: product.image_url ?? null,
  }));

  const topProductIds = ((topData ?? []) as Array<{ product_id: string }>).map(
    (row) => row.product_id,
  );

  const sales = (todaySales ?? []) as Array<{
    id: string;
    total: number;
    discount: number;
    payment_method: string | null;
    created_at: string;
    client: { name: string } | { name: string }[] | null;
    professional: { name: string } | { name: string }[] | null;
  }>;
  const first = <T,>(value: T | T[] | null): T | null =>
    Array.isArray(value) ? (value[0] ?? null) : value;
  const soldToday = sales.reduce((sum, sale) => sum + Number(sale.total), 0);

  return (
    <>
      <PageHeader
        eyebrow="Balcão"
        title="Nova venda"
        description="Produto vendido na hora, sem precisar de agendamento."
        action={
          <Button asChild variant="outline">
            <Link href="/produtos">
              <Package className="size-4" /> Produtos e estoque
            </Link>
          </Button>
        }
      />

      {products.length ? (
        <CounterSaleForm
          products={products}
          topProductIds={topProductIds}
          clients={clientData ?? []}
          professionals={professionalData ?? []}
        />
      ) : (
        <EmptyState
          title="Nenhum produto ativo"
          description="Cadastre produtos em Produtos e Estoque para vender no balcão."
        />
      )}

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Vendas de hoje</CardTitle>
          <span className="font-mono text-sm font-semibold">
            {formatBRL(soldToday)}
          </span>
        </CardHeader>
        <CardContent>
          {sales.length ? (
            <div className="space-y-2">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {first(sale.client)?.name ?? "Cliente não identificado"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatShortDateInTz(sale.created_at, tenant.timezone)}
                      {first(sale.professional)?.name
                        ? ` · ${first(sale.professional)!.name}`
                        : ""}
                      {Number(sale.discount) > 0
                        ? ` · desconto ${formatBRL(Number(sale.discount))}`
                        : ""}
                      {sale.payment_method ? "" : " · a receber"}
                    </p>
                  </div>
                  <span className="font-mono font-semibold">
                    {formatBRL(Number(sale.total))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Nenhuma venda de balcão hoje.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
