import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const querySchema = z.object({
  serviceId: z.uuid(),
  professionalId: z.uuid(),
  date: z.iso.date(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ tenant: string }> },
) {
  const { tenant } = await context.params;
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return Response.json({ error: "Seleção inválida." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_availability", {
    p_slug: tenant,
    p_professional_id: parsed.data.professionalId,
    p_service_id: parsed.data.serviceId,
    p_date: parsed.data.date,
  });
  if (error) return Response.json({ error: "Não foi possível consultar os horários." }, { status: 400 });
  return Response.json({ slots: data ?? [] }, { headers: { "cache-control": "no-store" } });
}
