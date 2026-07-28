"use client";

import { useActionState, useMemo, useState } from "react";
import {
  CheckCircle2,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { createCounterSale } from "@/modules/sales/actions";
import { PAYMENT_METHODS, formatBRL } from "@/lib/financial";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SaleProduct = {
  id: string;
  name: string;
  price: number;
  available: number;
  imageUrl: string | null;
};

type ClientOption = { id: string; name: string; phone: string | null };
type ProfessionalOption = { id: string; name: string };

const initialState: ActionState = { success: false, message: "" };

const selectClass =
  "border-input bg-background h-11 w-full rounded-md border px-3 text-base sm:text-sm";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Nova venda de balcão (§7.6): busca de produto, atalhos dos mais vendidos,
 * carrinho à direita no computador e fixo embaixo no celular, cliente
 * opcional, vendedor, desconto, forma de pagamento e "Receber R$ X".
 */
export function CounterSaleForm({
  products,
  topProductIds,
  clients,
  professionals,
}: {
  products: SaleProduct[];
  topProductIds: string[];
  clients: ClientOption[];
  professionals: ProfessionalOption[];
}) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [discountInput, setDiscountInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await createCounterSale(prev, formData);
      if (result.success) {
        setCart({});
        setDiscountInput("");
        setPaymentMethod("");
        setQuery("");
      }
      return result;
    },
    initialState,
  );

  const byId = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return products;
    return products.filter((product) => normalize(product.name).includes(term));
  }, [products, query]);

  const shortcuts = useMemo(
    () =>
      topProductIds
        .map((id) => byId.get(id))
        .filter((product): product is SaleProduct => Boolean(product)),
    [topProductIds, byId],
  );

  const lines = Object.entries(cart)
    .map(([id, quantity]) => ({ product: byId.get(id), quantity }))
    .filter(
      (line): line is { product: SaleProduct; quantity: number } =>
        Boolean(line.product) && line.quantity > 0,
    );

  const subtotal = lines.reduce(
    (total, line) => total + line.product.price * line.quantity,
    0,
  );
  const discount = Math.min(
    Math.max(Number(discountInput.replace(",", ".")) || 0, 0),
    subtotal,
  );
  const total = subtotal - discount;

  function add(product: SaleProduct, step = 1) {
    setCart((current) => {
      const next = (current[product.id] ?? 0) + step;
      if (next <= 0) {
        return Object.fromEntries(
          Object.entries(current).filter(([id]) => id !== product.id),
        );
      }
      return { ...current, [product.id]: next };
    });
  }

  const itemsPayload = JSON.stringify(
    lines.map((line) => ({
      productId: line.product.id,
      quantity: line.quantity,
    })),
  );

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <input type="hidden" name="items" value={itemsPayload} />

      {/* Catálogo */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar produto pelo nome…"
            aria-label="Buscar produto"
            className="h-11 pl-9 text-base sm:text-sm"
          />
        </div>

        {shortcuts.length && !query ? (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase">
              Mais vendidos
            </p>
            <div className="flex flex-wrap gap-2">
              {shortcuts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => add(product)}
                  className="hover:border-primary/60 inline-flex h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium"
                >
                  <Plus className="size-3.5" />
                  {product.name}
                  <span className="text-muted-foreground font-mono text-xs">
                    {formatBRL(product.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map((product) => {
            const inCart = cart[product.id] ?? 0;
            const soldOut = product.available - inCart <= 0;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => add(product)}
                disabled={soldOut}
                className={cn(
                  "flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                  soldOut
                    ? "cursor-not-allowed opacity-50"
                    : "hover:border-primary/60 hover:bg-muted/40",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatBRL(product.price)} ·{" "}
                    {soldOut
                      ? "sem estoque"
                      : `${product.available - inCart} disponível${product.available - inCart === 1 ? "" : "s"}`}
                  </p>
                </div>
                {inCart ? (
                  <span className="bg-primary text-primary-foreground grid size-7 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold">
                    {inCart}
                  </span>
                ) : (
                  <Plus className="text-muted-foreground size-4 shrink-0" />
                )}
              </button>
            );
          })}
          {!filtered.length ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm sm:col-span-2">
              Nenhum produto encontrado para “{query}”.
            </p>
          ) : null}
        </div>
      </div>

      {/* Carrinho */}
      <div className="bg-card sticky bottom-0 h-fit space-y-4 rounded-xl border p-4 lg:top-4 lg:bottom-auto">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingCart className="size-4" /> Carrinho
          <span className="text-muted-foreground font-normal">
            {lines.length} item{lines.length === 1 ? "" : "s"}
          </span>
        </p>

        {state.message ? (
          <Alert variant={state.success ? "default" : "destructive"}>
            {state.success ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : null}
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        {lines.length ? (
          <div className="space-y-2">
            {lines.map((line) => (
              <div
                key={line.product.id}
                className="flex items-center gap-2 rounded-lg border p-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {line.product.name}
                  </p>
                  <p className="text-muted-foreground font-mono text-xs">
                    {formatBRL(line.product.price * line.quantity)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => add(line.product, -1)}
                  aria-label={`Tirar um ${line.product.name}`}
                >
                  <Minus className="size-3.5" />
                </Button>
                <span className="w-6 text-center font-mono text-sm">
                  {line.quantity}
                </span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={line.quantity >= line.product.available}
                  onClick={() => add(line.product, 1)}
                  aria-label={`Somar um ${line.product.name}`}
                >
                  <Plus className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => add(line.product, -line.quantity)}
                  aria-label={`Tirar ${line.product.name} do carrinho`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            Toque num produto para começar a venda.
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="sale-client">Cliente (opcional)</Label>
          <select
            id="sale-client"
            name="clientId"
            defaultValue=""
            className={selectClass}
          >
            <option value="">Sem identificar</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
                {client.phone ? ` — ${client.phone}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sale-professional">Quem vendeu</Label>
          <select
            id="sale-professional"
            name="professionalId"
            defaultValue=""
            className={selectClass}
          >
            <option value="">Não informar</option>
            {professionals.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sale-discount">Desconto em reais</Label>
          <Input
            id="sale-discount"
            name="discount"
            inputMode="decimal"
            value={discountInput}
            onChange={(event) => setDiscountInput(event.target.value)}
            placeholder="0,00"
            className="h-11 text-base sm:text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sale-method">Forma de pagamento</Label>
          <select
            id="sale-method"
            name="paymentMethod"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
            className={selectClass}
          >
            <option value="">Deixar como a receber</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>

        <dl className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-mono">{formatBRL(subtotal)}</dd>
          </div>
          {discount > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Desconto</dt>
              <dd className="font-mono text-rose-600 dark:text-rose-400">
                − {formatBRL(discount)}
              </dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between pt-1">
            <dt className="font-medium">Total</dt>
            <dd className="font-mono text-xl font-semibold">
              {formatBRL(total)}
            </dd>
          </div>
        </dl>

        <Button
          type="submit"
          className="h-12 w-full"
          disabled={pending || !lines.length || total <= 0}
        >
          {paymentMethod
            ? `Receber ${formatBRL(total)}`
            : `Lançar ${formatBRL(total)} a receber`}
        </Button>
      </div>
    </form>
  );
}
