"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/types/domain";

const createAccessSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  password: z.string().min(6).max(72),
  phone: z.string().trim().max(30).optional(),
  available: z.coerce.boolean().optional(),
  serviceIds: z.array(z.uuid()).max(200).optional(),
  commissionRate: z.coerce.number().min(0).max(100).optional(),
  baseSalary: z.coerce.number().min(0).max(9999999).optional(),
});

/**
 * Cria um profissional já com acesso ao sistema (login por e-mail e senha).
 * Fluxo: usuário no Auth (admin) → profile (via trigger) → membership
 * (papel professional) → professional → serviços → disponibilidade padrão →
 * regra de pagamento. Exclusivo do dono.
 */
export async function createProfessionalWithAccess(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "memberships:manage")) {
    return { success: false, message: "Apenas o proprietário pode criar acessos." };
  }

  const parsed = createAccessSchema.safeParse({
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: formData.get("password"),
    phone: formData.get("phone"),
    available: formData.get("available") === "on",
    serviceIds: formData.getAll("serviceIds").map(String),
    commissionRate: formData.get("commissionRate") || 0,
    baseSalary: formData.get("baseSalary") || 0,
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Revise os dados. A senha precisa ter ao menos 6 caracteres.",
    };
  }

  const admin = createSupabaseAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser(
    {
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { name: parsed.data.name, phone: parsed.data.phone ?? "" },
    },
  );
  if (createError || !created.user) {
    const already = /already|exists|registered/i.test(createError?.message ?? "");
    return {
      success: false,
      message: already
        ? "Já existe uma conta com esse e-mail."
        : "Não foi possível criar o acesso. Tente novamente.",
    };
  }
  const authUserId = created.user.id;

  // O trigger on_auth_user_created cria o profile; buscamos (ou criamos) o id.
  let profileId: string | null = null;
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  profileId = profile?.id ?? null;
  if (!profileId) {
    const { data: inserted } = await admin
      .from("profiles")
      .insert({ auth_user_id: authUserId, name: parsed.data.name })
      .select("id")
      .single();
    profileId = inserted?.id ?? null;
  }
  if (!profileId) {
    await admin.auth.admin.deleteUser(authUserId);
    return { success: false, message: "Falha ao vincular o perfil." };
  }

  const { data: existingMembership } = await admin
    .from("memberships")
    .select("id")
    .eq("profile_id", profileId)
    .eq("barbershop_id", tenant.id)
    .maybeSingle();
  if (existingMembership) {
    await admin
      .from("memberships")
      .update({ role: "professional", status: "active" })
      .eq("id", existingMembership.id);
  } else {
    await admin.from("memberships").insert({
      profile_id: profileId,
      barbershop_id: tenant.id,
      role: "professional",
      status: "active",
    });
  }

  const { data: professional, error: proError } = await admin
    .from("professionals")
    .insert({
      barbershop_id: tenant.id,
      profile_id: profileId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      active: true,
      public_visible: parsed.data.available ?? true,
    })
    .select("id")
    .single();
  if (proError || !professional) {
    return { success: false, message: "Acesso criado, mas falhou ao criar o profissional." };
  }

  const serviceIds = parsed.data.serviceIds ?? [];
  if (serviceIds.length) {
    await admin.from("professional_services").insert(
      serviceIds.map((serviceId) => ({
        barbershop_id: tenant.id,
        professional_id: professional.id,
        service_id: serviceId,
      })),
    );
  }

  await admin.from("professional_availability").insert(
    [1, 2, 3, 4, 5, 6].map((weekday) => ({
      barbershop_id: tenant.id,
      professional_id: professional.id,
      weekday,
      starts_at: "09:00",
      ends_at: "18:00",
      slot_interval_minutes: 15,
    })),
  );

  if ((parsed.data.baseSalary ?? 0) > 0 || (parsed.data.commissionRate ?? 0) > 0) {
    const hasSalary = (parsed.data.baseSalary ?? 0) > 0;
    const hasCommission = (parsed.data.commissionRate ?? 0) > 0;
    await admin.from("employee_pay_settings").upsert(
      {
        barbershop_id: tenant.id,
        professional_id: professional.id,
        model:
          hasSalary && hasCommission
            ? "hybrid"
            : hasSalary
              ? "fixed"
              : "commission",
        base_salary: parsed.data.baseSalary ?? 0,
        commission_rate: parsed.data.commissionRate ?? 0,
        payment_period: "monthly",
      },
      { onConflict: "professional_id" },
    );
  }

  revalidatePath("/profissionais");
  revalidatePath("/usuarios");
  return {
    success: true,
    message: `${parsed.data.name} pode acessar com o e-mail e a senha definidos.`,
  };
}

/** Disponibilidade do profissional para novos agendamentos (etapa 3.3). */
export async function setProfessionalAvailability(formData: FormData) {
  const tenant = await requireTenant();
  const allowed =
    tenant.role === "owner" ||
    tenant.role === "manager" ||
    tenant.role === "receptionist";
  if (!allowed) return;
  const id = String(formData.get("id") ?? "");
  const available = String(formData.get("available")) === "true";
  if (!id) return;
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("professionals")
    .update({ public_visible: !available })
    .eq("id", id)
    .eq("barbershop_id", tenant.id);
  revalidatePath("/profissionais");
  revalidatePath("/agenda");
}

export async function toggleProfessional(formData: FormData) {
  const tenant = await requireTenant();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("professionals")
    .update({ active: String(formData.get("active")) !== "true" })
    .eq("id", String(formData.get("id")))
    .eq("barbershop_id", tenant.id);
  revalidatePath("/profissionais");
}

export async function deleteProfessional(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tenant = await requireTenant();
  if (!can(tenant.role, "catalog:manage")) {
    return { success: false, message: "Sem permissão para excluir." };
  }
  const id = String(formData.get("id") ?? "");
  if (!id) return { success: false, message: "Profissional inválido." };

  const supabase = await createSupabaseServerClient();
  const { data: future } = await supabase
    .from("appointments")
    .select("id")
    .eq("barbershop_id", tenant.id)
    .eq("professional_id", id)
    .in("status", ["pending", "confirmed"])
    .gte("starts_at", new Date().toISOString())
    .limit(1);
  if (future?.length) {
    return {
      success: false,
      message:
        "Há agendamentos futuros com este profissional. Desative-o em vez de excluir.",
    };
  }

  const { error } = await supabase
    .from("professionals")
    .delete()
    .eq("id", id)
    .eq("barbershop_id", tenant.id);
  if (error) {
    return {
      success: false,
      message:
        "Não é possível excluir: há histórico vinculado. Você pode desativar o profissional.",
    };
  }
  revalidatePath("/profissionais");
  return { success: true, message: "Profissional excluído." };
}
