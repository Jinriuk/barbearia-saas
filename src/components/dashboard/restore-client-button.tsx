"use client";

import { useActionState } from "react";
import { RotateCcw } from "lucide-react";
import type { ActionState } from "@/types/domain";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { success: false, message: "" };

/** Restaura um cliente arquivado de volta para a lista de ativos. */
export function RestoreClientButton({
  id,
  action,
  itemName,
}: {
  id: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  itemName: string;
}) {
  const [, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={pending}
        aria-label={`Restaurar cliente ${itemName}`}
      >
        <RotateCcw className="size-3.5" />
        {pending ? "Restaurando…" : "Restaurar"}
      </Button>
    </form>
  );
}
