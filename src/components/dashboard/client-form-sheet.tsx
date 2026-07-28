"use client";

import { useState } from "react";
import { Pencil, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ClientForm,
  type ClientFormValues,
} from "@/components/dashboard/client-form";

/**
 * Cadastro/edição em painel lateral (§7.3): o formulário não fica aberto o
 * tempo todo ao lado da lista — a largura inteira é da lista.
 */
export function ClientFormSheet({
  client,
  variant = "primary",
}: {
  client?: ClientFormValues;
  variant?: "primary" | "icon";
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {variant === "icon" ? (
          <Button size="sm" variant="outline" aria-label="Editar cliente">
            <Pencil className="size-3.5" /> Editar
          </Button>
        ) : (
          <Button>
            <UserPlus className="size-4" />
            {client ? "Editar cliente" : "Novo cliente"}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{client ? "Editar cliente" : "Novo cliente"}</SheetTitle>
          <SheetDescription>
            {client
              ? "As mudanças valem para o histórico inteiro do cliente."
              : "Nome e WhatsApp bastam; o resto pode entrar depois."}
          </SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <ClientForm client={client} onSaved={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
