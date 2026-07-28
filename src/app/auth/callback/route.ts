import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RECOVERY_COOKIE, RECOVERY_MAX_AGE } from "@/lib/auth/recovery";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  const target = next.startsWith("/") ? next : "/dashboard";
  const response = NextResponse.redirect(new URL(target, url));

  // Marca que ESTA sessão veio de um link de recuperação (Fase 0 §0.15).
  // Quem chega por aqui não sabe a senha antiga, então /atualizar-senha não
  // pode exigi-la; mas sem essa marca uma sessão comum esquecida aberta no
  // balcão trocaria a senha pela mesma tela, furando a reautenticação.
  if (code && target === "/atualizar-senha") {
    response.cookies.set(RECOVERY_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: RECOVERY_MAX_AGE,
    });
  }
  return response;
}
