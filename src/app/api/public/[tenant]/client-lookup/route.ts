import { requestIp, sharedRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicClientLookupSchema } from "@/lib/validators/entities";

/**
 * Reconhecimento de cliente recorrente (§7.11, etapa 4): o cliente digita o
 * WhatsApp e o formulário já sabe o primeiro nome dele.
 *
 * Cuidados deliberados:
 * - POST, não GET: o telefone não vai parar em log de acesso nem em Referer.
 * - Devolve SÓ o primeiro nome. Nem e-mail, nem histórico, nem identificador.
 * - Limite compartilhado por IP: consultar é barato, varrer a base não pode
 *   ser. Sem o limite, isso viraria um "esse número é cliente daqui?".
 * - Nunca diferencia "não é cliente" de "número inválido" no status HTTP.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ tenant: string }> },
) {
  const { tenant } = await context.params;
  if (!(await sharedRateLimit(`client-lookup:${requestIp(request)}`, 12, 60_000))) {
    return Response.json({ found: false }, { status: 429 });
  }
  const parsed = publicClientLookupSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return Response.json({ found: false });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_client_hint", {
    p_slug: tenant,
    p_phone: parsed.data.phone,
  });
  if (error || !data) return Response.json({ found: false });

  const hint = data as { found?: boolean; firstName?: string };
  return Response.json(
    { found: Boolean(hint.firstName), firstName: hint.firstName ?? null },
    { headers: { "cache-control": "no-store" } },
  );
}
