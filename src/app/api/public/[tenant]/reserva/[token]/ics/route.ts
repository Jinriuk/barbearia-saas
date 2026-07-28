import { buildIcsCalendar } from "@/lib/booking";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicBarbershop } from "@/modules/barbershops/queries";
import { publicReservationToken } from "@/lib/validators/entities";
import type { PublicAppointment } from "@/types/domain";

/**
 * Arquivo de calendário da reserva (Fase 4). O link de template do Google
 * não resolve iPhone nem Outlook — e é lá que está boa parte do cliente
 * final. Vem do token da própria reserva: quem tem o link tem o evento.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ tenant: string; token: string }> },
) {
  const { tenant, token } = await context.params;
  if (!rateLimit(`ics:${requestIp(request)}`, 20, 60_000)) {
    return new Response("Muitas consultas.", { status: 429 });
  }
  if (!publicReservationToken.safeParse(token).success) {
    return new Response("Reserva não encontrada.", { status: 404 });
  }

  const shop = await getPublicBarbershop(tenant);
  if (!shop) return new Response("Reserva não encontrada.", { status: 404 });

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("get_public_appointment", {
    p_token: token,
  });
  const reservation = data as
    | (PublicAppointment & { shopSlug: string })
    | null;
  if (!reservation || reservation.shopSlug !== shop.barbershop.slug) {
    return new Response("Reserva não encontrada.", { status: 404 });
  }

  const calendar = buildIcsCalendar({
    uid: `${reservation.reference ?? token}@${shop.barbershop.slug}`,
    startsAt: reservation.startsAt,
    endsAt: reservation.endsAt,
    summary: `${reservation.serviceName ?? "Horário"} — ${shop.barbershop.name}`,
    description: reservation.professionalName
      ? `Com ${reservation.professionalName}. Reserva ${reservation.reference ?? ""}`.trim()
      : `Reserva ${reservation.reference ?? ""}`.trim(),
    location: shop.settings.address,
    confirmed: reservation.status === "confirmed",
  });

  return new Response(calendar, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="reserva-${reservation.reference ?? "horario"}.ics"`,
      "cache-control": "no-store",
    },
  });
}
