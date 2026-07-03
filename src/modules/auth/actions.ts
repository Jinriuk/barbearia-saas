"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  barbershopSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validators/auth";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function signIn(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: value(formData, "email"),
    password: value(formData, "password"),
  });
  if (!parsed.success) redirect("/login?error=Dados+de+acesso+inválidos");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/login?error=E-mail+ou+senha+incorretos");
  redirect("/dashboard");
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
      data: { name: parsed.data.name },
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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_barbershop", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
  });
  if (error) redirect("/onboarding?error=Esse+endereço+não+está+disponível");
  redirect("/dashboard");
}
