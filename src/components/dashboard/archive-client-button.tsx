"use client";

import { useActionState } from "react";
import { Trash2, TriangleAlert } from "lucide-react";
import type { ActionState } from "@/types/domain";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { success: false, message: "" };

/**
 * Exclusão lógica de cliente: arquiva (active = false) preservando o histórico
 * de agendamentos. Substitui o antigo botão "Ativar/Desativar".
 */
export function ArchiveClientButton({
  id,
  action,
  itemName,
}: {
  id: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  itemName: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          aria-label={`Arquivar cliente ${itemName}`}
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlert className="text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Arquivar {itemName}?</AlertDialogTitle>
          <AlertDialogDescription>
            O cliente sai da lista, mas todo o histórico de agendamentos é
            preservado. Você pode reativá-lo depois pela busca de arquivados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state.message && !state.success ? (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <form action={formAction}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Arquivando…" : "Arquivar"}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
