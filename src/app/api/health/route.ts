export const dynamic = "force-dynamic";

/**
 * Health check em dois níveis:
 *  - GET /api/health          → liveness: sempre 200 se o app responde, com o
 *    diagnóstico do Supabase no corpo (o e2e e o boot local usam este modo);
 *  - GET /api/health?strict=1 → readiness: 503 se o Supabase não respondeu —
 *    é este que o monitor externo (UptimeRobot/Checkly) deve vigiar.
 */
export async function GET(request: Request) {
  const strict = new URL(request.url).searchParams.has("strict");

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
      status: strict ? (healthy ? "ok" : "degraded") : "ok",
      service: "barbearia-saas",
      checks: { supabase },
    },
    {
      status: strict && !healthy ? 503 : 200,
      headers: { "cache-control": "no-store" },
    },
  );
}
