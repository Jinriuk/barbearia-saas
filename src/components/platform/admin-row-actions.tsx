"use client";

import { useRef } from "react";
import { EllipsisVertical } from "lucide-react";
import {
  cancelSubscription,
  changePlan,
  extendTrial,
  reactivateSubscription,
  suspendSubscription,
} from "@/modules/platform/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Ações do super-admin por barbearia. Cada item envia um form para a server
 * action correspondente; cancelar pede confirmação explícita.
 */
export function AdminRowActions({
  barbershopId,
  status,
  plan,
}: {
  barbershopId: string;
  status: string | null;
  plan: string;
}) {
  const cancelFormRef = useRef<HTMLFormElement>(null);
  const otherPlan = plan === "plus" ? "starter" : "plus";

  return (
    <>
      {/* Forms fora do dropdown: itens do menu disparam via requestSubmit */}
      <form
        ref={cancelFormRef}
        action={cancelSubscription}
        className="hidden"
        aria-hidden
      >
        <input type="hidden" name="barbershopId" value={barbershopId} />
      </form>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label="Ações">
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Assinatura</DropdownMenuLabel>

          {status !== "active" ? (
            <DropdownMenuItem asChild>
              <form action={reactivateSubscription} className="w-full">
                <input type="hidden" name="barbershopId" value={barbershopId} />
                <button type="submit" className="w-full text-left">
                  Reativar (30 dias)
                </button>
              </form>
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuItem asChild>
            <form action={extendTrial} className="w-full">
              <input type="hidden" name="barbershopId" value={barbershopId} />
              <button type="submit" className="w-full text-left">
                Estender teste +7 dias
              </button>
            </form>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <form action={changePlan} className="w-full">
              <input type="hidden" name="barbershopId" value={barbershopId} />
              <input type="hidden" name="plan" value={otherPlan} />
              <button type="submit" className="w-full text-left">
                Mudar para {otherPlan === "plus" ? "Plus" : "Padrão"}
              </button>
            </form>
          </DropdownMenuItem>

          {status !== "suspended" && status !== "canceled" ? (
            <DropdownMenuItem asChild>
              <form action={suspendSubscription} className="w-full">
                <input type="hidden" name="barbershopId" value={barbershopId} />
                <button type="submit" className="w-full text-left">
                  Suspender (bloqueia painel)
                </button>
              </form>
            </DropdownMenuItem>
          ) : null}

          {status !== "canceled" ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  if (
                    window.confirm(
                      "Cancelar a assinatura? A página pública desta barbearia sai do ar.",
                    )
                  ) {
                    cancelFormRef.current?.requestSubmit();
                  }
                }}
              >
                Cancelar assinatura
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
