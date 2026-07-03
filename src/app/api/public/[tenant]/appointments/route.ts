import { publicErrorMessage } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicBookingSchema } from "@/lib/validators/entities";

export async function POST(
  request: Request,
  context: { params: Promise<{ tenant: string }> },
) {
  const { tenant } = await context.params;
  const parsed = publicBookingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Revise os dados da reserva." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_public_appointment", {
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
  return Response.json({ ok: true }, { status: 201 });
}
