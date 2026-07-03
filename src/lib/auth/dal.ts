import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MembershipRole, TenantContext } from "@/types/domain";

export const getSessionUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const requireUser = cache(async () => {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
});

export const getTenantContext = cache(
  async (): Promise<TenantContext | null> => {
    const user = await getSessionUser();
    if (!user) return null;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("memberships")
      .select(
        "barbershop_id, role, profile:profiles!inner(id,name,auth_user_id), barbershop:barbershops!inner(id,name,slug,timezone,plan)",
      )
      .eq("status", "active")
      .eq("profiles.auth_user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    const profile = Array.isArray(data.profile)
      ? data.profile[0]
      : data.profile;
    const barbershop = Array.isArray(data.barbershop)
      ? data.barbershop[0]
      : data.barbershop;
    if (!profile || !barbershop) return null;

    return {
      id: barbershop.id,
      name: barbershop.name,
      slug: barbershop.slug,
      timezone: barbershop.timezone,
      plan: barbershop.plan,
      role: data.role as MembershipRole,
      profileId: profile.id,
      profileName: profile.name,
    };
  },
);

export const requireTenant = cache(async () => {
  await requireUser();
  const tenant = await getTenantContext();
  if (!tenant) redirect("/onboarding");
  return tenant;
});
