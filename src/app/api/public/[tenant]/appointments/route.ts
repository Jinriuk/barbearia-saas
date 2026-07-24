import { publicErrorMessage } from "@/lib/errors";
import { requestIp, sharedRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicBookingSchema } from "@/lib/validators/entities";

export async function POST(
  request: Request,
  context: { params: Promise<{ tenant: string }> },
) {
  const { tenant } = await context.params;
  // Limite compartilhado entre instâncias (Fase 0): o em-memória sozinho não
  // segura rajadas distribuídas em múltiplas lambdas.
  if (!(await sharedRateLimit(`booking:${requestIp(request)}`, 8, 60_000))) {
    return Response.json(
      { error: "Muitas tentativas. Aguarde um minuto e tente de novo." },
      { status: 429 },
    );
  }
  const parsed = publicBookingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      {
        error: "Revise os dados da reserva.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_public_appointment", {
    p_slug: tenant,
    p_professional_id: parsed.data.professionalId,
    p_service_id: parsed.data.serviceId,
    p_starts_at: parsed.data.startsAt,
    p_client_name: parsed.data.clientName,
    p_client_phone: parsed.data.clientPhone,
    p_client_email: parsed.data.clientEmail || null,
    p_notes: parsed.data.notes || null,
    p_products: parsed.data.products ?? [],
  });
  if (error) return Response.json({ error: publicErrorMessage(error) }, { status: 409 });

  // Contrato público: status realmente persistido + referência curta da
  // reserva. Nenhum dado privado e nenhum UUID interno.
  const result = (data ?? {}) as { reference?: string; status?: string };
  return Response.json(
    {
      ok: true,
      reference: result.reference ?? null,
      status: result.status ?? "pending",
    },
    { status: 201 },
  );
}
