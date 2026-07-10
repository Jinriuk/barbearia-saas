"use client";

import { useActionState } from "react";
import { ShieldX, TriangleAlert } from "lucide-react";
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
 * Exclusão definitiva (LGPD): apaga o cliente ou, se houver histórico de
 * atendimentos, anonimiza os dados pessoais. Irreversível — por isso só
 * aparece na lista de arquivados, como segundo passo consciente.
 */
export function DeleteClientForeverButton({
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
          aria-label={`Excluir definitivamente o cliente ${itemName}`}
        >
          <ShieldX />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlert className="text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>
            Excluir {itemName} definitivamente?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Ação irreversível, pensada para pedidos de exclusão de dados
            (LGPD). Se o cliente tiver atendimentos registrados, os dados
            pessoais (nome, telefone e e-mail) são removidos e o histórico
            fica anônimo.
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
              {pending ? "Excluindo…" : "Excluir definitivamente"}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
