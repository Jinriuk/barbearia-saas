"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Papéis e remoção de membros. O CONVITE vive em ./invites.ts desde a Fase 3
 * (item 3.8): a antiga `inviteMember` exigia que a pessoa já tivesse conta —
 * era ela que obrigava o dono a "pedir por WhatsApp que a pessoa se cadastre
 * antes", ou a criar a senha dela na mão.
 */

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
