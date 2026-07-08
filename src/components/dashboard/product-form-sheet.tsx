"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { saveProduct } from "@/modules/products/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type ProductInput = {
  id: string;
  name: string;
  description: string | null;
  sale_price: number;
  cost_price: number | null;
  public_visible: boolean;
};

/**
 * Formulário de produto em painel lateral, para criar e editar. A action
 * saveProduct trata os dois casos pela presença do id.
 */
export function ProductFormSheet({ product }: { product?: ProductInput }) {
  const [open, setOpen] = useState(false);
  const editing = Boolean(product);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {editing ? (
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Editar produto ${product!.name}`}
          >
            <Pencil />
          </Button>
        ) : (
          <Button className="w-full">
            <Plus className="size-4" /> Novo produto
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editing ? "Editar produto" : "Novo produto"}</SheetTitle>
          <SheetDescription>
            O saldo de estoque é controlado pelas movimentações de entrada e
            saída.
          </SheetDescription>
        </SheetHeader>
        <form
          action={saveProduct}
          onSubmit={() => setOpen(false)}
          className="flex flex-1 flex-col gap-4 p-4"
        >
          {product ? (
            <input type="hidden" name="id" value={product.id} />
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="product-name">Nome</Label>
            <Input
              id="product-name"
              name="name"
              defaultValue={product?.name}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="product-price">Preço de venda</Label>
              <Input
                id="product-price"
                name="salePrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue={product?.sale_price}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-cost">Custo (opcional)</Label>
              <Input
                id="product-cost"
                name="costPrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue={product?.cost_price ?? undefined}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-description">Descrição</Label>
            <Textarea
              id="product-description"
              name="description"
              rows={3}
              defaultValue={product?.description ?? ""}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="publicVisible"
              defaultChecked={product ? product.public_visible : true}
              className="size-4 rounded border"
            />
            Oferecer no checkout do agendamento (Plus)
          </label>
          <SheetFooter className="mt-auto px-0">
            <Button type="submit" className="w-full">
              {editing ? "Salvar alterações" : "Adicionar produto"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
