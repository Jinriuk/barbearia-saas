"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types/domain";

// Erros de negócio das RPCs → mensagens claras para o balcão.
const RPC_MESSAGES: Record<string, string> = {
  MEMBERSHIP_ALREADY_ACTIVE:
    "Esse cliente já tem um plano em aberto. Cancele o atual antes de vender outro.",
  PAYMENT_METHOD_REQUIRED: "Informe a forma de pagamento.",
  PLAN_NOT_FOUND: "Plano não encontrado ou desativado.",
  CLIENT_NOT_FOUND: "Cliente não encontrado.",
  MEMBERSHIP_NOT_FOUND: "Contrato não encontrado.",
  MEMBERSHIP_NOT_ACTIVE:
    "Contrato pausado ou cancelado — retome antes de renovar.",
  MEMBERSHIP_CANCELED: "Contrato cancelado é definitivo.",
  NOT_AUTHORIZED: "Sem permissão para esta ação.",
};

function rpcMessage(error: { message: string } | null, fallback: string) {
  if (!error) return fallback;
  return RPC_MESSAGES[error.message] ?? fallback;
}

const planSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).optional(),
  price: z.coerce.number().positive().max(100000),
  period: z.enum(["monthly", "quarterly", "yearly"]),
  active: z.boolean().optional(),
});

export async function saveMembershipPlan(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = planSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    period: formData.get("period"),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) {
    return { success: false, message: "Revise os campos do plano." };
  }
  const tenant = await requireTenant();
  if (!can(tenant.role, "catalog:manage")) {
    return { success: false, message: "Sem permissão para salvar planos." };
  }
  const supabase = await createSupabaseServerClient();
  const payload = {
    barbershop_id: tenant.id,
    name: parsed.data.name,
    description: parsed.data.description || null,
    price: parsed.data.price,
    period: parsed.data.period,
    active: parsed.data.active ?? true,
    updated_at: new Date().toISOString(),
  };

  let planId = parsed.data.id ?? null;
  if (planId) {
    const { error } = await supabase
      .from("customer_membership_plans")
      .update(payload)
      .eq("id", planId)
      .eq("barbershop_id", tenant.id);
    if (error) {
      return { success: false, message: "Não foi possível salvar o plano." };
    }
  } else {
    const { data: plan, error } = await supabase
      .from("customer_membership_plans")
      .insert(payload)
      .select("id")
      .single();
    if (error || !plan) {
      return { success: false, message: "Não foi possível salvar o plano." };
    }
    planId = plan.id;
  }

  // Serviços incluídos: o form envia include-{serviceId} + uses-{serviceId}.
  // O conjunto enviado substitui o atual (contratos vigentes não mudam de
  // preço — o benefício segue as entitlements atuais do plano).
  const serviceIds = formData.getAll("serviceIds").map(String);
  const entitlements = serviceIds
    .filter((serviceId) => formData.get(`include-${serviceId}`) === "on")
    .map((serviceId) => {
      const uses = Number(formData.get(`uses-${serviceId}`) ?? 1);
      return {
        barbershop_id: tenant.id,
        plan_id: planId,
        service_id: serviceId,
        uses_per_period:
          Number.isFinite(uses) && uses >= 1 && uses <= 99
            ? Math.floor(uses)
            : 1,
      };
    });
  if (!entitlements.length) {
    return {
      success: false,
      message: "Inclua pelo menos um serviço no plano.",
    };
  }
  await supabase
    .from("membership_entitlements")
    .delete()
    .eq("barbershop_id", tenant.id)
    .eq("plan_id", planId);
  const { error: entitlementError } = await supabase
    .from("membership_entitlements")
    .insert(entitlements);
  if (entitlementError) {
    return {
      success: false,
      message: "Plano salvo, mas os serviços incluídos falharam. Revise.",
    };
  }
  revalidatePath("/planos");
  return { success: true, message: "Plano salvo." };
}

export async function toggleMembershipPlan(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "catalog:manage")) return;
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active")) === "true";
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("customer_membership_plans")
    .update({ active: !active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("barbershop_id", tenant.id);
  revalidatePath("/planos");
}

const sellSchema = z.object({
  clientId: z.uuid(),
  planId: z.uuid(),
  paymentMethod: z.enum(["cash", "card", "pix", "other"]),
});

export async function sellMembership(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = sellSchema.safeParse({
    clientId: formData.get("clientId"),
    planId: formData.get("planId"),
    paymentMethod: formData.get("paymentMethod"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Escolha cliente, plano e forma de pagamento.",
    };
  }
  const tenant = await requireTenant();
  if (!can(tenant.role, "clients:manage")) {
    return { success: false, message: "Sem permissão para vender planos." };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("sell_customer_membership", {
    p_client_id: parsed.data.clientId,
    p_plan_id: parsed.data.planId,
    p_payment_method: parsed.data.paymentMethod,
  });
  if (error) {
    return {
      success: false,
      message: rpcMessage(error, "Não foi possível concluir a venda."),
    };
  }
  revalidatePath("/planos");
  revalidatePath("/financeiro");
  return { success: true, message: "Plano vendido — pagamento registrado." };
}

const renewSchema = z.object({
  membershipId: z.uuid(),
  paymentMethod: z.enum(["cash", "card", "pix", "other"]),
});

export async function renewMembership(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = renewSchema.safeParse({
    membershipId: formData.get("membershipId"),
    paymentMethod: formData.get("paymentMethod"),
  });
  if (!parsed.success) {
    return { success: false, message: "Escolha a forma de pagamento." };
  }
  const tenant = await requireTenant();
  if (!can(tenant.role, "clients:manage")) {
    return { success: false, message: "Sem permissão para renovar planos." };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("renew_customer_membership", {
    p_membership_id: parsed.data.membershipId,
    p_payment_method: parsed.data.paymentMethod,
  });
  if (error) {
    return {
      success: false,
      message: rpcMessage(error, "Não foi possível registrar a renovação."),
    };
  }
  revalidatePath("/planos");
  revalidatePath("/financeiro");
  return { success: true, message: "Renovação registrada." };
}

export async function setMembershipStatus(formData: FormData) {
  const tenant = await requireTenant();
  // Pausa/cancelamento mudam contrato: dono e gerente (a RPC revalida).
  if (!can(tenant.role, "catalog:manage")) return;
  const membershipId = String(formData.get("membershipId") ?? "");
  const action = String(formData.get("statusAction") ?? "");
  if (!membershipId || !["pause", "resume", "cancel"].includes(action)) return;
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("set_customer_membership_status", {
    p_membership_id: membershipId,
    p_action: action,
  });
  revalidatePath("/planos");
}
