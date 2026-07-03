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

export function DeleteEntityButton({
  id,
  action,
  entityLabel,
  itemName,
}: {
  id: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  entityLabel: string;
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
          aria-label={`Excluir ${entityLabel}`}
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlert className="text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Excluir {entityLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            {itemName} será removido permanentemente. Se houver agendamentos
            futuros, a exclusão é bloqueada — prefira desativar.
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
              {pending ? "Excluindo…" : "Excluir"}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
