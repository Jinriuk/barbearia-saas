import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CANCEL_AFTER_DAYS, LOCK_AFTER_DAYS } from "@/lib/billing";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

/**
 * Régua de cobrança diária (Vercel Cron): persiste as transições que o
 * accessState já deriva na leitura, para que a página pública também
 * acompanhe (o espelho barbershops.status muda via trigger no banco).
 *
 *   venceu            → past_due   (aviso no painel)
 *   venceu + 5 dias   → suspended  (painel bloqueado, página no ar)
 *   venceu + 15 dias  → canceled   (página sai do ar)
 *
 * Sem CRON_SECRET configurado a rota responde 503 e não faz nada.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET não configurado." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const lockCutoff = new Date(now - LOCK_AFTER_DAYS * DAY_MS).toISOString();
  const cancelCutoff = new Date(now - CANCEL_AFTER_DAYS * DAY_MS).toISOString();

  // Ordem do maior atraso para o menor, para cada linha cair na regra certa.
  const { data: canceledTrials } = await supabase
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: nowIso })
    .eq("status", "trialing")
    .lt("trial_ends_at", cancelCutoff)
    .select("id");
  const { data: canceledPaid } = await supabase
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: nowIso })
    .in("status", ["active", "past_due", "suspended"])
    .lt("current_period_end", cancelCutoff)
    .select("id");

  const { data: suspendedTrials } = await supabase
    .from("subscriptions")
    .update({ status: "suspended" })
    .eq("status", "trialing")
    .lt("trial_ends_at", lockCutoff)
    .select("id");
  const { data: suspendedPaid } = await supabase
    .from("subscriptions")
    .update({ status: "suspended" })
    .in("status", ["active", "past_due"])
    .lt("current_period_end", lockCutoff)
    .select("id");

  const { data: pastDue } = await supabase
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("status", "active")
    .lt("current_period_end", nowIso)
    .select("id");

  return Response.json({
    canceled: (canceledTrials?.length ?? 0) + (canceledPaid?.length ?? 0),
    suspended: (suspendedTrials?.length ?? 0) + (suspendedPaid?.length ?? 0),
    pastDue: pastDue?.length ?? 0,
    ranAt: nowIso,
  });
}
