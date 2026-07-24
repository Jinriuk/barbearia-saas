"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarX2, LoaderCircle } from "lucide-react";
import { cancelPublicReservation } from "@/modules/public-booking/actions";
import type { ActionState } from "@/types/domain";

/**
 * Cancelamento em dois toques (evita cancelar sem querer) — após o sucesso,
 * atualiza a página para mostrar o status real persistido.
 */
export function CancelReservationButton({ token }: { token: string }) {
  const [armed, setArmed] = useState(false);
  const router = useRouter();
  const [state, formAction, pending] = useActionState(cancelPublicReservation, {
    success: false,
    message: "",
  } satisfies ActionState);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-red-300 text-[15px] font-medium text-red-700 transition-colors hover:bg-red-50"
      >
        <CalendarX2 className="size-4.5" />
        Cancelar reserva
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-red-600 text-[15px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? (
            <LoaderCircle className="size-4.5 animate-spin" />
          ) : (
            <CalendarX2 className="size-4.5" />
          )}
          Confirmar cancelamento
        </button>
      </form>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="w-full text-center text-sm underline underline-offset-2 opacity-60"
      >
        Voltar
      </button>
      {!state.success && state.message ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
