"use client";

import { useActionState, useState } from "react";
import { ImageUp, UserRound } from "lucide-react";
import { updateProfessionalProfile } from "@/modules/professionals/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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

const initialState: ActionState = { success: false, message: "" };

/**
 * Perfil público do profissional (foto + bio) em painel lateral. A foto
 * substitui a inicial nos cards do painel e no site de agendamento.
 */
export function ProfessionalProfileSheet({
  professional,
}: {
  professional: {
    id: string;
    name: string;
    bio: string | null;
    avatarUrl: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [bioLength, setBioLength] = useState(professional.bio?.length ?? 0);
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await updateProfessionalProfile(prev, formData);
      if (result.success) setOpen(false);
      return result;
    },
    initialState,
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          <ImageUp className="size-3.5" /> Foto e bio
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Perfil de {professional.name}</SheetTitle>
          <SheetDescription>
            A foto e a apresentação aparecem no card do site de agendamento.
          </SheetDescription>
        </SheetHeader>
        <form action={formAction} className="flex flex-1 flex-col gap-5 p-4">
          {state.message && !state.success ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
          <input type="hidden" name="id" value={professional.id} />

          <div className="space-y-2.5">
            <Label>Foto do perfil</Label>
            <div className="flex items-center gap-4">
              <span className="bg-muted grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border">
                {professional.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={professional.avatarUrl}
                    alt={`Foto de ${professional.name}`}
                    className="size-full object-cover"
                  />
                ) : (
                  <UserRound className="text-muted-foreground size-6" />
                )}
              </span>
              <div className="flex-1 space-y-1.5">
                <input
                  type="file"
                  name="avatar"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={pending}
                  className="text-muted-foreground file:bg-muted file:text-foreground block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm"
                  aria-label={`Nova foto de ${professional.name}`}
                />
                <p className="text-muted-foreground text-xs">
                  PNG, JPG ou WebP, até 2 MB.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`bio-${professional.id}`}>Apresentação</Label>
              <span className="text-muted-foreground text-xs">
                {bioLength}/200
              </span>
            </div>
            <Textarea
              id={`bio-${professional.id}`}
              name="bio"
              rows={3}
              maxLength={200}
              defaultValue={professional.bio ?? ""}
              onChange={(event) => setBioLength(event.target.value.length)}
              placeholder="Ex.: Especialista em cortes clássicos e barba."
            />
          </div>

          <SheetFooter className="mt-auto px-0">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Salvando…" : "Salvar perfil"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
