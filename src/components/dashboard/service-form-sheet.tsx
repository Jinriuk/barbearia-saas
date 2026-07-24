"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { saveService } from "@/modules/services/actions";
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

type ServiceInput = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  category: string | null;
  image_url: string | null;
  active: boolean;
  audience?: string | null;
  return_days?: number | null;
  commission_rate?: number | null;
  professionalIds: string[];
};

const AUDIENCES = [
  {
    value: "public",
    label: "Público geral",
    hint: "Aparece na página e no agendamento online.",
  },
  {
    value: "members",
    label: "Exclusivo de assinantes",
    hint: "Não aparece ao público geral (planos de clientes).",
  },
  {
    value: "internal",
    label: "Interno (balcão)",
    hint: "Só a equipe lança, nunca aparece na página.",
  },
] as const;

/**
 * Formulário de serviço em painel lateral, usado tanto para criar quanto para
 * editar. A action saveService trata os dois casos pela presença do id e
 * sincroniza categoria, imagem, visibilidade e os profissionais que executam.
 */
export function ServiceFormSheet({
  service,
  professionals = [],
}: {
  service?: ServiceInput;
  professionals?: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  // Fecha o painel apenas quando a action confirma o salvamento; em erro de
  // validação/banco o painel permanece aberto com a mensagem visível.
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await saveService(prev, formData);
      if (result.success) setOpen(false);
      return result;
    },
    { success: false, message: "" } satisfies ActionState,
  );
  const editing = Boolean(service);
  const assigned = new Set(service?.professionalIds ?? []);

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
        <form action={formAction} className="flex flex-1 flex-col gap-4 p-4">
          {state.message && !state.success ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
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
            <Label htmlFor="service-commission">Comissão do serviço (%)</Label>
            <Input
              id="service-commission"
              name="commissionRate"
              type="number"
              min="0"
              max="100"
              step="0.5"
              defaultValue={service?.commission_rate ?? 0}
            />
            <p className="text-muted-foreground text-xs">
              Maior que zero sobrepõe a comissão padrão do profissional
              (Financeiro → Comissões).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-return-days">
              Retorno recomendado (dias)
            </Label>
            <Input
              id="service-return-days"
              name="returnDays"
              type="number"
              min="0"
              max="365"
              placeholder="Ex.: 21"
              defaultValue={service?.return_days ?? ""}
            />
            <p className="text-muted-foreground text-xs">
              Usado para prever o retorno de clientes com pouco histórico.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-category">Categoria</Label>
            <Input
              id="service-category"
              name="category"
              placeholder="Ex.: Cabelo, Barba, Combo"
              defaultValue={service?.category ?? ""}
              maxLength={60}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-image">Imagem (URL)</Label>
            <Input
              id="service-image"
              name="imageUrl"
              type="url"
              placeholder="https://…"
              defaultValue={service?.image_url ?? ""}
            />
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

          {professionals.length ? (
            <div className="space-y-2">
              <input type="hidden" name="hasProfessionals" value="1" />
              <Label>Profissionais que executam</Label>
              <div className="grid max-h-40 gap-1.5 overflow-y-auto rounded-lg border p-3">
                {professionals.map((professional) => (
                  <label
                    key={professional.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="professionalIds"
                      value={professional.id}
                      defaultChecked={!editing || assigned.has(professional.id)}
                      className="size-4 rounded border"
                    />
                    {professional.name}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="service-audience">Quem pode ver e agendar</Label>
            <select
              id="service-audience"
              name="audience"
              defaultValue={service?.audience ?? "public"}
              className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
            >
              {AUDIENCES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} — {item.hint}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              defaultChecked={service?.active ?? true}
              className="size-4 rounded border"
            />
            Visível no catálogo e na página pública
          </label>

          <SheetFooter className="mt-auto px-0">
            <Button type="submit" className="w-full" disabled={pending}>
              {editing ? "Salvar alterações" : "Adicionar serviço"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
