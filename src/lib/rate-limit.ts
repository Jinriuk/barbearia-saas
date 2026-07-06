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

export function requestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
