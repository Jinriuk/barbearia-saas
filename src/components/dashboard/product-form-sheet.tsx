"use client";

import { useActionState, useState } from "react";
import { Image as ImageIcon, Pencil, Plus } from "lucide-react";
import { saveProduct } from "@/modules/products/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  image_url?: string | null;
};

/**
 * Formulário de produto em painel lateral, para criar e editar. A action
 * saveProduct trata os dois casos pela presença do id.
 */
const initialState: ActionState = { success: false, message: "" };

export function ProductFormSheet({ product }: { product?: ProductInput }) {
  const [open, setOpen] = useState(false);
  // Fecha o painel apenas quando a action confirma o salvamento; em erro de
  // validação/banco o painel permanece aberto com a mensagem visível.
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await saveProduct(prev, formData);
      if (result.success) setOpen(false);
      return result;
    },
    initialState,
  );
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
        <form action={formAction} className="flex flex-1 flex-col gap-4 p-4">
          {state.message && !state.success ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
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
          <div className="space-y-2">
            <Label htmlFor="product-photo">Foto do produto</Label>
            <div className="flex items-center gap-3">
              {product?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url}
                  alt={`Foto de ${product.name}`}
                  className="size-14 shrink-0 rounded-lg border object-cover"
                />
              ) : (
                <span className="bg-muted text-muted-foreground grid size-14 shrink-0 place-items-center rounded-lg border">
                  <ImageIcon className="size-5" />
                </span>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <input
                  id="product-photo"
                  type="file"
                  name="photo"
                  accept="image/png,image/jpeg,image/webp"
                  className="text-muted-foreground file:bg-muted file:text-foreground block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm"
                />
                <p className="text-muted-foreground text-xs">
                  PNG, JPG ou WebP, até 2 MB. Aparece na vitrine pública.
                </p>
              </div>
            </div>
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
            <Button type="submit" className="w-full" disabled={pending}>
              {editing ? "Salvar alterações" : "Adicionar produto"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
