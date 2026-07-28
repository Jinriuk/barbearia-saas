import { publicErrorMessage } from "@/lib/errors";
import { requestIp, sharedRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicBookingSchema } from "@/lib/validators/entities";
import type { PublicAppointment } from "@/types/domain";

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
    p_payment_preference: parsed.data.paymentPreference || null,
  });
  if (error) return Response.json({ error: publicErrorMessage(error) }, { status: 409 });

  // Contrato público (Fase 4): a tela final é montada com o que o servidor
  // GRAVOU — serviço, profissional, horário, produtos, pagamento e total —,
  // e não com o que o navegador lembrava. Nenhum UUID interno sai daqui.
  const result = (data ?? {}) as Partial<PublicAppointment>;
  return Response.json(
    {
      ok: true,
      reference: result.reference ?? null,
      status: result.status ?? "pending",
      token: result.token ?? null,
      appointment: result.startsAt ? (result as PublicAppointment) : null,
    },
    { status: 201 },
  );
}
