import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Aceite do convite de colaborador (Fase 3 — item 3.8).
 *
 * Aplica os convites pendentes de um e-mail: cria a associação e, para o
 * papel de profissional, a ficha, os serviços marcados, o expediente padrão
 * e a regra de pagamento. Roda no retorno do link (`/auth/callback`) — quem
 * chegou ali provou que controla a caixa de entrada.
 *
 * Idempotente de propósito: um duplo clique no link, ou o dono reenviando o
 * convite, não pode gerar dois profissionais nem duplicar serviços.
 *
 * Usa o client de serviço porque o convidado ainda não tem associação
 * nenhuma — sob RLS ele não conseguiria criar a própria.
 */

type InviteRow = {
  id: string;
  barbershop_id: string;
  role: string;
  name: string;
  phone: string | null;
  service_ids: string[] | null;
  commission_rate: number | null;
  base_salary: number | null;
};

export async function applyPendingInvites(
  profileId: string,
  email: string | null | undefined,
): Promise<boolean> {
  const normalized = email?.trim().toLowerCase();
  if (!profileId || !normalized) return false;

  const admin = createSupabaseAdminClient();

  const { data: invites } = await admin
    .from("team_invites")
    .select(
      "id,barbershop_id,role,name,phone,service_ids,commission_rate,base_salary",
    )
    .eq("status", "pending")
    .ilike("email", normalized)
    .gte("expires_at", new Date().toISOString());

  if (!invites?.length) return false;

  let applied = false;
  for (const invite of invites as InviteRow[]) {
    const { data: existing } = await admin
      .from("memberships")
      .select("id,role")
      .eq("profile_id", profileId)
      .eq("barbershop_id", invite.barbershop_id)
      .maybeSingle();

    // O convite nunca rebaixa nem promove um proprietário.
    if (existing?.role === "owner") continue;

    if (existing) {
      await admin
        .from("memberships")
        .update({ role: invite.role, status: "active" })
        .eq("id", existing.id);
    } else {
      const { error } = await admin.from("memberships").insert({
        profile_id: profileId,
        barbershop_id: invite.barbershop_id,
        role: invite.role,
        status: "active",
      });
      if (error) continue;
    }

    if (invite.role === "professional") {
      await createProfessionalFromInvite(admin, invite, profileId);
    }

    await admin
      .from("team_invites")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_profile_id: profileId,
      })
      .eq("id", invite.id);

    applied = true;
  }

  return applied;
}

async function createProfessionalFromInvite(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  invite: InviteRow,
  profileId: string,
) {
  const { data: alreadyThere } = await admin
    .from("professionals")
    .select("id")
    .eq("barbershop_id", invite.barbershop_id)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (alreadyThere) return;

  const { data: professional } = await admin
    .from("professionals")
    .insert({
      barbershop_id: invite.barbershop_id,
      profile_id: profileId,
      name: invite.name,
      phone: invite.phone,
      active: true,
      public_visible: true,
    })
    .select("id")
    .single();
  if (!professional) return;

  const serviceIds = invite.service_ids ?? [];
  if (serviceIds.length) {
    await admin.from("professional_services").insert(
      serviceIds.map((serviceId) => ({
        barbershop_id: invite.barbershop_id,
        professional_id: professional.id,
        service_id: serviceId,
      })),
    );
  }

  await admin.from("professional_availability").insert(
    [1, 2, 3, 4, 5, 6].map((weekday) => ({
      barbershop_id: invite.barbershop_id,
      professional_id: professional.id,
      weekday,
      starts_at: "09:00",
      ends_at: "18:00",
      slot_interval_minutes: 15,
    })),
  );

  const baseSalary = Number(invite.base_salary ?? 0);
  const commissionRate = Number(invite.commission_rate ?? 0);
  if (baseSalary > 0 || commissionRate > 0) {
    await admin.from("employee_pay_settings").upsert(
      {
        barbershop_id: invite.barbershop_id,
        professional_id: professional.id,
        model:
          baseSalary > 0 && commissionRate > 0
            ? "hybrid"
            : baseSalary > 0
              ? "fixed"
              : "commission",
        base_salary: baseSalary,
        commission_rate: commissionRate,
        payment_period: "monthly",
      },
      { onConflict: "professional_id" },
    );
  }
}
