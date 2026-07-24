import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CANCEL_AFTER_DAYS, LOCK_AFTER_DAYS } from "@/lib/billing";
import { errorMessage, logError, logInfo } from "@/lib/log";

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
 * Qualquer transição que falhe é logada e derruba o status para 500 — assim
 * a execução aparece como FALHA no painel de crons da Vercel, em vez de
 * fingir sucesso.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET não configurado." },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const lockCutoff = new Date(now - LOCK_AFTER_DAYS * DAY_MS).toISOString();
  const cancelCutoff = new Date(now - CANCEL_AFTER_DAYS * DAY_MS).toISOString();

  const counts = { canceled: 0, suspended: 0, pastDue: 0, normalized: 0 };
  const failures: string[] = [];

  const run = async (
    step: string,
    bucket: keyof typeof counts,
    query: PromiseLike<{
      data: { id: string; barbershop_id?: string }[] | null;
      error: unknown;
    }>,
  ) => {
    const { data, error } = await query;
    if (error) {
      failures.push(step);
      logError("cron.billing.step_failed", {
        step,
        message: errorMessage(error),
      });
      return;
    }
    counts[bucket] += data?.length ?? 0;
    // Transições automáticas também são auditadas (Fase 2B) — mesmas regras
    // de rastreabilidade das ações manuais.
    if (data?.length) {
      await supabase.from("audit_logs").insert(
        data
          .filter((row) => row.barbershop_id)
          .map((row) => ({
            barbershop_id: row.barbershop_id,
            action: `billing.cron_${bucket}`,
            entity_type: "subscription",
            entity_id: row.id,
            metadata: { step },
          })),
      );
    }
  };

  try {
    // Higiene: assinatura ativa sem fim de período nunca transiciona (e
    // vira acesso perpétuo). Normaliza para 30 dias a partir de agora.
    await run(
      "normalize_missing_period",
      "normalized",
      supabase
        .from("subscriptions")
        .update({
          current_period_end: new Date(now + 30 * DAY_MS).toISOString(),
        })
        .eq("status", "active")
        .is("current_period_end", null)
        .select("id,barbershop_id"),
    );

    // Ordem do maior atraso para o menor, para cada linha cair na regra certa.
    await run(
      "cancel_trials",
      "canceled",
      supabase
        .from("subscriptions")
        .update({ status: "canceled", canceled_at: nowIso })
        .eq("status", "trialing")
        .lt("trial_ends_at", cancelCutoff)
        .select("id,barbershop_id"),
    );
    await run(
      "cancel_paid",
      "canceled",
      supabase
        .from("subscriptions")
        .update({ status: "canceled", canceled_at: nowIso })
        .in("status", ["active", "past_due", "suspended"])
        .lt("current_period_end", cancelCutoff)
        .select("id,barbershop_id"),
    );
    await run(
      "suspend_trials",
      "suspended",
      supabase
        .from("subscriptions")
        .update({ status: "suspended" })
        .eq("status", "trialing")
        .lt("trial_ends_at", lockCutoff)
        .select("id,barbershop_id"),
    );
    await run(
      "suspend_paid",
      "suspended",
      supabase
        .from("subscriptions")
        .update({ status: "suspended" })
        .in("status", ["active", "past_due"])
        .lt("current_period_end", lockCutoff)
        .select("id,barbershop_id"),
    );
    await run(
      "mark_past_due",
      "pastDue",
      supabase
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("status", "active")
        .lt("current_period_end", nowIso)
        .select("id,barbershop_id"),
    );
  } catch (error) {
    logError("cron.billing.crashed", { message: errorMessage(error) });
    return Response.json(
      { error: "Falha inesperada na régua de cobrança." },
      { status: 500 },
    );
  }

  const body = { ...counts, failures, ranAt: nowIso };
  if (failures.length) {
    logError("cron.billing.completed_with_failures", body);
    return Response.json(body, { status: 500 });
  }
  logInfo("cron.billing.completed", body);
  return Response.json(body);
}
