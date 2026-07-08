"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types/domain";

const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(["manager", "receptionist", "professional"]),
});

const inviteErrors: Record<string, string> = {
  USER_NOT_FOUND:
    "Nenhuma conta encontrada com esse e-mail. Peça para a pessoa criar a conta em /cadastro e convide de novo.",
  CANNOT_CHANGE_OWNER: "Esse e-mail pertence ao proprietário da barbearia.",
  NOT_AUTHORIZED: "Apenas o proprietário pode convidar membros.",
};

export async function inviteMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = inviteSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { success: false, message: "Revise o e-mail e o papel." };
  }

  const tenant = await requireTenant();
  if (!can(tenant.role, "memberships:manage")) {
    return { success: false, message: "Apenas o proprietário pode convidar." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("invite_member", {
    p_barbershop_id: tenant.id,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });
  if (error) {
    return {
      success: false,
      message:
        inviteErrors[error.message] ??
        "Não foi possível convidar. Tente novamente.",
    };
  }
  revalidatePath("/profissionais");
  return { success: true, message: "Membro adicionado à equipe." };
}

const roleSchema = z.enum(["manager", "receptionist", "professional"]);

export async function changeMemberRole(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "memberships:manage")) return;

  const membershipId = String(formData.get("membershipId") ?? "");
  const parsed = roleSchema.safeParse(formData.get("role"));
  if (!membershipId || !parsed.success) return;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("memberships")
    .update({ role: parsed.data })
    .eq("id", membershipId)
    .eq("barbershop_id", tenant.id)
    .neq("role", "owner");
  revalidatePath("/profissionais");
}

export async function removeMember(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "memberships:manage")) return;

  const membershipId = String(formData.get("membershipId") ?? "");
  if (!membershipId) return;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("memberships")
    .delete()
    .eq("id", membershipId)
    .eq("barbershop_id", tenant.id)
    .neq("role", "owner");
  revalidatePath("/profissionais");
}
