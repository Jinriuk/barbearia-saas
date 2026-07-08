export const TENANT = process.env.E2E_TENANT ?? "aurora";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type PublicData = {
  barbershop: { name: string };
  services: Array<{ id: string; durationMinutes: number }>;
  professionals: Array<{ id: string; serviceIds: string[] }>;
};

let cached: PublicData | null | undefined;

/**
 * Busca serviços/profissionais reais pela mesma RPC pública que o site usa.
 * Devolve null quando o Supabase não é alcançável do ambiente (ex.: sandbox
 * com egress restrito) — os testes dependentes se auto-pulam nesse caso.
 */
export async function fetchPublicData(): Promise<PublicData | null> {
  if (cached !== undefined) return cached;
  if (!SUPABASE_URL || !ANON_KEY) {
    cached = null;
    return cached;
  }
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_public_barbershop`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: ANON_KEY,
          authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ p_slug: TENANT }),
      },
    );
    cached = response.ok ? ((await response.json()) as PublicData) : null;
  } catch {
    cached = null;
  }
  return cached;
}
