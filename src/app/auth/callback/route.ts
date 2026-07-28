import { NextResponse } from "next/server";
import { applyPendingInvites } from "@/lib/auth/invites";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Aceite do convite de equipe (Fase 3 — item 3.8). Acontece aqui, e não
    // no login, porque este é o retorno do link enviado por e-mail: quem
    // chegou até aqui provou que controla a caixa de entrada. Sem isto, o
    // convidado entraria sem associação nenhuma e veria "sem barbearia".
    const user = data?.user;
    if (user?.email) {
      const admin = createSupabaseAdminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (profile?.id) {
        await applyPendingInvites(profile.id, user.email);
      }
    }
  }
  return NextResponse.redirect(
    new URL(next.startsWith("/") ? next : "/dashboard", url),
  );
}
