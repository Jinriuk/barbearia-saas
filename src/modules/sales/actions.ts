"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { formatBRL } from "@/lib/financial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types/domain";

const saleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.coerce.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(50),
  clientId: z.uuid().optional(),
  professionalId: z.uuid().optional(),
  discount: z.coerce.number().min(0).max(999999).optional(),
  paymentMethod: z.enum(["cash", "card", "pix", "other"]).optional(),
  notes: z.string().trim().max(300).optional(),
});

// Erros da RPC → frases que o balcão entende sem abrir o log.
const SALE_ERRORS: Record<string, string> = {
  NOT_AUTHORIZED: "Seu papel não pode registrar vendas.",
  EMPTY_CART: "Adicione pelo menos um produto ao carrinho.",
  CART_TOO_LARGE: "A venda tem itens demais. Divida em duas.",
  INSUFFICIENT_STOCK:
    "Estoque insuficiente para um dos produtos. Registre a entrada em Produtos e Estoque.",
  PRODUCT_NOT_FOUND: "Um dos produtos saiu do catálogo. Atualize a página.",
  CLIENT_NOT_FOUND: "Cliente não encontrado. Atualize a página.",
  PROFESSIONAL_NOT_FOUND: "Profissional não encontrado. Atualize a página.",
  DISCOUNT_TOO_LARGE: "O desconto não pode ser maior que o total.",
  ZERO_TOTAL: "Uma venda de R$ 0,00 não é venda. Ajuste o desconto.",
  INVALID_QUANTITY: "Quantidade inválida em um dos itens.",
  PAYMENT_METHOD_REQUIRED: "Informe como o cliente pagou.",
};

/**
 * Venda de balcão (§7.6, pilar G5): carrinho, desconto, vendedor e forma de
 * pagamento numa RPC transacional — itens, baixa de estoque e receita
 * entram juntos ou não entram. Sem forma de pagamento a receita nasce
 * pendente, como manda a verdade financeira da Fase 0.
 */
export async function createCounterSale(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "inventory:manage")) {
    return { success: false, message: "Sem permissão para registrar vendas." };
  }

  let items: unknown = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { success: false, message: "Carrinho inválido. Recomece a venda." };
  }

  const parsed = saleSchema.safeParse({
    items,
    clientId: formData.get("clientId") || undefined,
    professionalId: formData.get("professionalId") || undefined,
    discount: formData.get("discount") || 0,
    paymentMethod: formData.get("paymentMethod") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Revise o carrinho, o desconto e a forma de pagamento.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_counter_sale", {
    p_barbershop: tenant.id,
    p_items: parsed.data.items,
    p_client_id: parsed.data.clientId ?? null,
    p_professional_id: parsed.data.professionalId ?? null,
    p_discount: parsed.data.discount ?? 0,
    p_payment_method: parsed.data.paymentMethod ?? null,
    p_notes: parsed.data.notes ?? null,
  });
  if (error) {
    const known = Object.keys(SALE_ERRORS).find((code) =>
      error.message.includes(code),
    );
    return {
      success: false,
      message: known
        ? SALE_ERRORS[known]
        : "Não foi possível registrar a venda. Tente novamente.",
    };
  }

  revalidatePath("/vendas");
  revalidatePath("/produtos");
  revalidatePath("/financeiro");
  revalidatePath("/dashboard");

  const result = (data ?? {}) as { total?: number; paid?: boolean };
  const total = formatBRL(Number(result.total ?? 0));
  return {
    success: true,
    message: result.paid
      ? `Venda registrada — ${total} recebido e estoque baixado.`
      : `Venda registrada — ${total} lançado como a receber.`,
  };
}
