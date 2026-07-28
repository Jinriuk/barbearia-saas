"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { APP_URL } from "@/lib/app-url";
import { applyPendingInvites } from "@/lib/auth/invites";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/types/domain";

/**
 * Convite de colaborador por e-mail (Fase 3 — item 3.8, regra crítica do
 * §7.7).
 *
 * O guia é explícito: **o proprietário não deve criar a senha do
 * colaborador**. Até aqui o dono criava a senha e a passava por WhatsApp —
 * uma senha que a pessoa não escolheu, que trafega em texto puro e que o
 * dono conhece. Agora o convite vai por e-mail e a senha nasce com quem vai
 * usá-la.
 *
 * Dois caminhos, dependendo de a pessoa já ter conta:
 *  · Sem conta → `inviteUserByEmail` manda o link; o convite é aplicado no
 *    retorno (`/auth/callback`) e ela define a senha em seguida.
 *  · Com conta → o acesso é liberado na hora. O convite por e-mail do
 *    Supabase não funciona para usuário existente, e mandar um link que ela
 *    não conseguiria usar seria um beco sem saída.
 */

const inviteSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  role: z.enum(["professional", "receptionist", "manager"]),
  phone: z.string().trim().max(30).optional(),
  serviceIds: z.array(z.uuid()).max(200).optional(),
  commissionRate: z.coerce.number().min(0).max(100).optional(),
  baseSalary: z.coerce.number().min(0).max(9999999).optional(),
});

const roleLabels: Record<string, string> = {
  professional: "Profissional",
  receptionist: "Secretária",
  manager: "Gerente",
};

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** O convidado cai no callback (que aplica o convite) e define a senha. */
const inviteRedirectTo = `${APP_URL}/auth/callback?next=/atualizar-senha`;

export async function sendTeamInvite(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "memberships:manage")) {
    return { success: false, message: "Apenas o proprietário pode convidar." };
  }

  const parsed = inviteSchema.safeParse({
    name: formData.get("name"),
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    role: formData.get("role") || "professional",
    phone: formData.get("phone") ?? undefined,
    serviceIds: formData.getAll("serviceIds").map(String),
    commissionRate: formData.get("commissionRate") || 0,
    baseSalary: formData.get("baseSalary") || 0,
  });
  if (!parsed.success) {
    return { success: false, message: "Revise o nome e o e-mail." };
  }

  const supabase = await createSupabaseServerClient();

  // Já tem conta? A resposta muda o caminho inteiro.
  const { data: existingProfileId } = await supabase.rpc(
    "profile_id_by_email",
    { p_barbershop: tenant.id, p_email: parsed.data.email },
  );

  if (existingProfileId) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("id,role,status")
      .eq("profile_id", existingProfileId)
      .eq("barbershop_id", tenant.id)
      .maybeSingle();
    if (membership?.status === "active") {
      return { success: false, message: "Essa pessoa já faz parte da equipe." };
    }
  }

  const record = {
    barbershop_id: tenant.id,
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role,
    status: "pending" as const,
    phone: parsed.data.phone || null,
    service_ids: parsed.data.serviceIds ?? [],
    commission_rate: parsed.data.commissionRate ?? 0,
    base_salary: parsed.data.baseSalary ?? 0,
    invited_by: tenant.profileId,
    expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
  };

  // O índice de unicidade é parcial (só convites pendentes), então
  // `upsert` não se aplica: atualiza o pendente existente ou insere um novo.
  const { data: pending } = await supabase
    .from("team_invites")
    .select("id")
    .eq("barbershop_id", tenant.id)
    .ilike("email", parsed.data.email)
    .eq("status", "pending")
    .maybeSingle();

  const { data: invite, error: saveError } = pending
    ? await supabase
        .from("team_invites")
        .update(record)
        .eq("id", pending.id)
        .select("id")
        .single()
    : await supabase.from("team_invites").insert(record).select("id").single();

  if (saveError || !invite) {
    return {
      success: false,
      message: "Não foi possível registrar o convite. Tente de novo.",
    };
  }

  // Conta existente: nada de e-mail de convite — libera o acesso agora.
  if (existingProfileId) {
    const applied = await applyPendingInvites(
      String(existingProfileId),
      parsed.data.email,
    );
    revalidatePath("/profissionais");
    return applied
      ? {
          success: true,
          message: `${parsed.data.name} já tinha conta com esse e-mail. O acesso como ${roleLabels[parsed.data.role]} foi liberado — é só entrar com a senha dela.`,
        }
      : {
          success: false,
          message:
            "Essa pessoa já tem conta, mas não foi possível liberar o acesso. Tente de novo.",
        };
  }

  const admin = createSupabaseAdminClient();
  const { error: mailError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    { redirectTo: inviteRedirectTo, data: { name: parsed.data.name } },
  );

  revalidatePath("/profissionais");

  if (mailError) {
    return {
      success: false,
      message:
        "Convite registrado, mas o e-mail não saiu. Confira o endereço e reenvie pela lista de convites.",
    };
  }

  return {
    success: true,
    message: `Convite enviado para ${parsed.data.email}. ${parsed.data.name} define a própria senha ao aceitar.`,
  };
}

export async function resendTeamInvite(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "memberships:manage")) return;
  const id = String(formData.get("inviteId") ?? "");
  if (!id) return;

  const supabase = await createSupabaseServerClient();
  const { data: invite } = await supabase
    .from("team_invites")
    .select("email,name,status")
    .eq("id", id)
    .eq("barbershop_id", tenant.id)
    .maybeSingle();
  if (!invite || invite.status !== "pending") return;

  const admin = createSupabaseAdminClient();
  await admin.auth.admin.inviteUserByEmail(invite.email, {
    redirectTo: inviteRedirectTo,
    data: { name: invite.name },
  });
  await supabase
    .from("team_invites")
    .update({ expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString() })
    .eq("id", id)
    .eq("barbershop_id", tenant.id);

  revalidatePath("/profissionais");
}

export async function revokeTeamInvite(formData: FormData) {
  const tenant = await requireTenant();
  if (!can(tenant.role, "memberships:manage")) return;
  const id = String(formData.get("inviteId") ?? "");
  if (!id) return;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("team_invites")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("barbershop_id", tenant.id)
    .eq("status", "pending");
  revalidatePath("/profissionais");
}
