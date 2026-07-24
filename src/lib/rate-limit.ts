// Limitador em memória, por instância serverless: melhor esforço contra rajadas
// de um mesmo IP. O limite forte (por telefone) fica no banco, na RPC.
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter(
    (timestamp) => now - timestamp < windowMs,
  );
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [bucketKey, bucketHits] of buckets) {
      if (bucketHits.every((timestamp) => now - timestamp >= windowMs)) {
        buckets.delete(bucketKey);
      }
    }
  }
  return true;
}

/**
 * Limitador compartilhado entre instâncias serverless (Fase 0): janela fixa
 * contabilizada no Postgres via RPC `consume_rate_limit`, executável apenas
 * pelo service_role. O limite em memória continua como primeira barreira
 * barata; se o banco estiver indisponível ou o service_role não estiver
 * configurado, degrada para o comportamento em memória (nunca derruba a
 * jornada pública por causa do limitador).
 */
export async function sharedRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  if (!rateLimit(key, limit, windowMs)) return false;
  try {
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: Math.ceil(windowMs / 1000),
    });
    if (error) return true; // melhor esforço: não bloquear por falha interna
    return data !== false;
  } catch {
    return true;
  }
}

export function requestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
