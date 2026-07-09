"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";
import {
  barbershopSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validators/auth";

/** Primeiro slug livre a partir de uma base (base, base-2, base-3, …). */
async function resolveAvailableSlug(base: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("barbershops")
    .select("slug")
    .ilike("slug", `${base}%`);
  const taken = new Set((data ?? []).map((row) => row.slug as string));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 100; n += 1) {
    const candidate = `${base}-${n}`.slice(0, 63);
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, 63);
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function signIn(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: value(formData, "email"),
    password: value(formData, "password"),
  });
  if (!parsed.success) redirect("/login?error=Dados+de+acesso+inválidos");

  const next = value(formData, "next");
  const target =
    next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/login?error=E-mail+ou+senha+incorretos");
  redirect(target);
}

export async function signUp(formData: FormData) {
  const parsed = signupSchema.safeParse({
    name: value(formData, "name"),
    email: value(formData, "email"),
    password: value(formData, "password"),
  });
  if (!parsed.success) redirect("/cadastro?error=Revise+os+dados+informados");

  const origin =
    (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // preferred_plan viaja no metadata para o onboarding pré-selecionar o
      // plano escolhido na landing, mesmo passando pela confirmação de e-mail.
      data: {
        name: parsed.data.name,
        preferred_plan:
          value(formData, "plano") === "plus" ? "plus" : "starter",
        preferred_vertical:
          value(formData, "vertical") === "salon" ? "salon" : "barber",
      },
      emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
    },
  });
  if (error) redirect("/cadastro?error=Não+foi+possível+criar+a+conta");
  redirect("/login?message=Confira+seu+e-mail+para+confirmar+a+conta");
}

export async function requestPasswordReset(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    email: value(formData, "email"),
  });
  if (!parsed.success)
    redirect("/recuperar-senha?error=Informe+um+e-mail+válido");

  const origin =
    (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL;
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: origin
      ? `${origin}/auth/callback?next=/atualizar-senha`
      : undefined,
  });
  redirect("/login?message=Se+o+e-mail+existir,+você+receberá+as+instruções");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createBarbershop(formData: FormData) {
  const parsed = barbershopSchema.safeParse({
    name: value(formData, "name"),
    slug: value(formData, "slug").toLowerCase(),
  });
  if (!parsed.success) redirect("/onboarding?error=Revise+o+nome+e+o+endereço");
  const plan = value(formData, "plan") === "plus" ? "plus" : "starter";
  const vertical = value(formData, "vertical") === "salon" ? "salon" : "barber";

  // Slug automático: usa o informado ou gera a partir do nome, garantindo
  // que seja único (base, base-2, base-3…).
  const base = slugify(parsed.data.slug || parsed.data.name);
  if (base.length < 3) {
    redirect("/onboarding?error=Nome+muito+curto+para+gerar+o+endereço");
  }
  const slug = await resolveAvailableSlug(base);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_barbershop", {
    p_name: parsed.data.name,
    p_slug: slug,
    p_plan: plan,
    p_vertical: vertical,
  });
  if (error) redirect("/onboarding?error=Esse+endereço+não+está+disponível");
  // bemvindo=1 marca a chegada pós-cadastro: o dashboard dispara a conversão
  // (Meta Pixel CompleteRegistration) uma única vez e limpa o parâmetro.
  redirect("/dashboard?bemvindo=1");
}
