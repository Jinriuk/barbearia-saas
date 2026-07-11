export const dynamic = "force-dynamic";

/**
 * Health check em dois níveis:
 *  - GET /api/health           → liveness: "o processo responde?" — 200
 *    imediato, sem tocar em dependência nenhuma (é o que o boot do
 *    Playwright e o deploy usam);
 *  - GET /api/health?strict=1  → readiness: consulta o Supabase e devolve
 *    503 se ele não respondeu — é este que o monitor externo
 *    (UptimeRobot/Checkly) deve vigiar.
 */
export async function GET(request: Request) {
  const strictParam = new URL(request.url).searchParams.get("strict");
  // Presença conta como ligado (?strict), mas "?strict=0"/"false" desliga —
  // um monitor configurado para desativar o strict não pode ativá-lo.
  const strict =
    strictParam !== null && strictParam !== "0" && strictParam !== "false";

  if (!strict) {
    return Response.json(
      { status: "ok", service: "barbearia-saas" },
      { headers: { "cache-control": "no-store" } },
    );
  }

  let supabase = "unconfigured";
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (base && anonKey) {
    try {
      const response = await fetch(`${base}/auth/v1/health`, {
        headers: { apikey: anonKey },
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
      supabase = response.ok ? "ok" : `error:${response.status}`;
    } catch {
      supabase = "unreachable";
    }
  }

  const healthy = supabase === "ok";
  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "barbearia-saas",
      checks: { supabase },
    },
    {
      status: healthy ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
