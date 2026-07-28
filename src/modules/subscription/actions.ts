"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { errorMessage, logError } from "@/lib/log";
import type { ActionState } from "@/types/domain";

const reasonSchema = z.string().trim().max(400).optional();

/**
 * Cancelamento self-service do plano (Fase 0 §0.2).
 *
 * "Cancele quando quiser" aparecia cinco vezes na comunicação e os Termos já
 * prometiam o mesmo, mas o produto não tinha caminho de saída nenhum: o único
 * cancelamento existente era o do console de super-admin.
 *
 * O pedido NÃO muda `subscriptions.status` na hora. Mudar para 'canceled'
 * dispara o trigger `sync_barbershop_status`, que espelha em
 * `barbershops.status` e tira a PÁGINA PÚBLICA do ar — o dono perderia na
 * hora o mês que já pagou, e os clientes dele perderiam o agendamento. O
 * pedido só marca a data; quem executa é a régua diária de cobrança.
 */
export async function requestCancellation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant({ allowLocked: true });
  if (tenant.role !== "owner") {
    return {
      success: false,
      message: "Apenas o proprietário pode cancelar o plano.",
    };
  }
  // Confirmação digitada: o botão sozinho é fácil demais de tocar sem querer
  // num celular, e o efeito é o fim do acesso.
  if (
    String(formData.get("confirm") ?? "")
      .trim()
      .toUpperCase() !== "CANCELAR"
  ) {
    return {
      success: false,
      message: "Para confirmar, digite CANCELAR no campo acima.",
    };
  }

  const reason = reasonSchema.safeParse(formData.get("reason") ?? undefined);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    "request_subscription_cancellation",
    {
      p_barbershop: tenant.id,
      p_reason: reason.success ? (reason.data ?? null) : null,
    },
  );
  if (error) {
    logError("subscription.cancel_failed", { message: errorMessage(error) });
    return {
      success: false,
      message: "Não foi possível registrar o cancelamento. Tente de novo.",
    };
  }

  revalidatePath("/assinatura");
  const endsAt = typeof data === "string" ? new Date(data) : null;
  return {
    success: true,
    message: endsAt
      ? `Cancelamento registrado. Seu acesso continua até ${endsAt.toLocaleDateString("pt-BR")}.`
      : "Cancelamento registrado.",
  };
}

/** Desfaz o pedido enquanto o período ainda não terminou. */
export async function revokeCancellation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (formData.get("intent") !== "revoke") {
    return { success: false, message: "Ação inválida." };
  }
  const tenant = await requireTenant({ allowLocked: true });
  if (tenant.role !== "owner") {
    return {
      success: false,
      message: "Apenas o proprietário pode alterar o plano.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("revoke_subscription_cancellation", {
    p_barbershop: tenant.id,
  });
  if (error) {
    logError("subscription.cancel_revoke_failed", {
      message: errorMessage(error),
    });
    return {
      success: false,
      message: "Não foi possível reativar. Tente de novo.",
    };
  }

  revalidatePath("/assinatura");
  return { success: true, message: "Plano reativado. Nada será cancelado." };
}
