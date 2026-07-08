"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { saveService } from "@/modules/services/actions";
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

type ServiceInput = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
};

/**
 * Formulário de serviço em painel lateral, usado tanto para criar quanto para
 * editar. A action saveService já trata os dois casos pela presença do id.
 */
export function ServiceFormSheet({ service }: { service?: ServiceInput }) {
  const [open, setOpen] = useState(false);
  const editing = Boolean(service);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {editing ? (
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Editar serviço ${service!.name}`}
          >
            <Pencil />
          </Button>
        ) : (
          <Button className="w-full">
            <Plus className="size-4" /> Novo serviço
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editing ? "Editar serviço" : "Novo serviço"}</SheetTitle>
          <SheetDescription>
            Alterações atualizam a página pública e o painel sem afetar
            agendamentos já feitos.
          </SheetDescription>
        </SheetHeader>
        <form
          action={saveService}
          onSubmit={() => setOpen(false)}
          className="flex flex-1 flex-col gap-4 p-4"
        >
          {service ? (
            <input type="hidden" name="id" value={service.id} />
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="service-name">Nome</Label>
            <Input
              id="service-name"
              name="name"
              defaultValue={service?.name}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="service-price">Preço</Label>
              <Input
                id="service-price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={service?.price}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-duration">Minutos</Label>
              <Input
                id="service-duration"
                name="durationMinutes"
                type="number"
                min="5"
                step="5"
                defaultValue={service?.duration_minutes}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-description">Descrição</Label>
            <Textarea
              id="service-description"
              name="description"
              rows={3}
              defaultValue={service?.description ?? ""}
            />
          </div>
          <SheetFooter className="mt-auto px-0">
            <Button type="submit" className="w-full">
              {editing ? "Salvar alterações" : "Adicionar serviço"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
