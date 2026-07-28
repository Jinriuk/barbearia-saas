import { NextResponse } from "next/server";
import { applyPendingInvites } from "@/lib/auth/invites";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { RECOVERY_GRANT_MINUTES } from "@/lib/auth/recovery";
import { errorMessage, logError } from "@/lib/log";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  let userId: string | null = null;
  let userEmail: string | null = null;
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    // O resultado era descartado. Um código inválido não derruba a sessão que
    // já estava no navegador, então a rota "dava certo" com a sessão antiga —
    // e qualquer pessoa com o painel aberto abria esta URL para ganhar a
    // permissão de trocar senha sem saber a atual (Fase 0 §0.15).
    if (!error && data.session) {
      userId = data.session.user.id;
      userEmail = data.session.user.email ?? null;
    }
  }

  // `next.startsWith("/")` sozinho aceita "//host", que o URL resolve para
  // outro domínio — redirecionamento aberto a partir de um link do nosso
  // domínio. Mesma guarda que o signIn já fazia.
  const safe =
    next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\");
  const target = safe ? next : "/dashboard";

  // Aceite do convite de equipe (Fase 3 — item 3.8). Acontece aqui, e não no
  // login, porque este é o retorno do link enviado por e-mail: quem chegou
  // até aqui com um código VÁLIDO provou que controla a caixa de entrada.
  // Sem isto, o convidado entraria sem associação nenhuma e veria "sem
  // barbearia". Depende da mesma checagem do §0.15 acima — código inválido
  // não aplica convite nenhum.
  if (userId && userEmail) {
    try {
      const admin = createSupabaseAdminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("auth_user_id", userId)
        .maybeSingle();
      if (profile?.id) {
        await applyPendingInvites(profile.id, userEmail);
      }
    } catch (error) {
      // O convite continua pendente e o dono pode reenviar. Falhar aqui não
      // pode derrubar o login de quem já autenticou.
      logError("auth.invite_apply_failed", { message: errorMessage(error) });
    }
  }

  // Só depois de a troca do código ter dado certo é que a sessão vira "veio
  // do link de recuperação". A concessão mora no banco e só o service_role a
  // emite: cookie seria forjável na mão pelo DevTools de quem estivesse com o
  // aparelho, que é justamente o cenário do §0.15.
  if (userId && target === "/atualizar-senha") {
    try {
      const admin = createSupabaseAdminClient();
      const { error } = await admin.rpc("issue_password_recovery_grant", {
        p_auth_user_id: userId,
        p_minutes: RECOVERY_GRANT_MINUTES,
      });
      if (error) throw error;
    } catch (error) {
      // Sem a concessão a pessoa cai na tela que manda usar Minha conta. É
      // uma falha visível e segura — o contrário (liberar por padrão) não.
      logError("auth.recovery_grant_failed", { message: errorMessage(error) });
    }
  }

  return NextResponse.redirect(new URL(target, url));
}
