import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { RECOVERY_GRANT_MINUTES } from "@/lib/auth/recovery";
import { errorMessage, logError } from "@/lib/log";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  let userId: string | null = null;
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    // O resultado era descartado. Um código inválido não derruba a sessão que
    // já estava no navegador, então a rota "dava certo" com a sessão antiga —
    // e qualquer pessoa com o painel aberto abria esta URL para ganhar a
    // permissão de trocar senha sem saber a atual (Fase 0 §0.15).
    if (!error && data.session) userId = data.session.user.id;
  }

  // `next.startsWith("/")` sozinho aceita "//host", que o URL resolve para
  // outro domínio — redirecionamento aberto a partir de um link do nosso
  // domínio. Mesma guarda que o signIn já fazia.
  const safe =
    next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\");
  const target = safe ? next : "/dashboard";

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
