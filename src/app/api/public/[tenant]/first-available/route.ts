import { z } from "zod";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const querySchema = z.object({
  serviceId: z.uuid(),
  date: z.iso.date(),
});

/**
 * "Primeiro profissional disponível" (Fase 2): uma única RPC avalia todos os
 * profissionais habilitados no serviço e devolve os horários ordenados, cada
 * um com o profissional correspondente. O horário é validado de novo na
 * reserva — esta lista é só a vitrine.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ tenant: string }> },
) {
  const { tenant } = await context.params;
  if (!rateLimit(`first-available:${requestIp(request)}`, 30, 60_000)) {
    return Response.json(
      { error: "Muitas consultas. Aguarde um instante e tente de novo." },
      { status: 429 },
    );
  }
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success)
    return Response.json({ error: "Seleção inválida." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_first_available", {
    p_slug: tenant,
    p_service_id: parsed.data.serviceId,
    p_date: parsed.data.date,
  });
  if (error)
    return Response.json(
      { error: "Não foi possível consultar os horários." },
      { status: 400 },
    );
  return Response.json(
    { slots: data ?? [] },
    { headers: { "cache-control": "no-store" } },
  );
}
