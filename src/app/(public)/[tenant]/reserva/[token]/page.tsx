import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck2, MessageCircle } from "lucide-react";
import {
  getPublicBarbershop,
  tenantPageMetadata,
} from "@/modules/barbershops/queries";
import { tenantStyle } from "@/lib/colors";
import { whatsAppHref } from "@/lib/contact";
import { verticalCopy } from "@/lib/verticals";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/public-site/public-header";
import { CancelReservationButton } from "@/components/public-site/cancel-reservation-button";

export const dynamic = "force-dynamic";

type PublicReservation = {
  reference: string;
  status: string;
  startsAt: string;
  endsAt: string;
  serviceName: string | null;
  servicePrice: number | null;
  professionalName: string | null;
  shopName: string;
  shopSlug: string;
  timezone: string;
  whatsappNumber: string | null;
  cancellationNoticeMinutes: number;
  canCancel: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando confirmação",
  confirmed: "Confirmada",
  completed: "Concluída",
  canceled: "Cancelada",
  no_show: "Não compareceu",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  return tenantPageMetadata(params, "Minha reserva");
}

/**
 * Autogestão da reserva pelo cliente (Fase 2): consulta por token limitado —
 * sem login, sem expor UUID interno, sem dados de outros clientes. Cancelar
 * respeita a antecedência configurada; remarcar = cancelar + reservar de
 * novo (decisão documentada; a remarcação assistida fica com a equipe).
 */
export default async function PublicReservationPage({
  params,
}: {
  params: Promise<{ tenant: string; token: string }>;
}) {
  const { tenant, token } = await params;
  const data = await getPublicBarbershop(tenant);
  if (!data) notFound();
  if (!/^[A-Za-z0-9]{20,40}$/.test(token)) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: reservationData } = await supabase.rpc(
    "get_public_appointment",
    { p_token: token },
  );
  const reservation = reservationData as PublicReservation | null;
  if (!reservation || reservation.shopSlug !== data.barbershop.slug) {
    notFound();
  }

  const copy = verticalCopy(data.barbershop.vertical);
  const whatsapp = whatsAppHref(reservation.whatsappNumber);
  const whenFormat = new Intl.DateTimeFormat("pt-BR", {
    timeZone: reservation.timezone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const active =
    reservation.status === "pending" || reservation.status === "confirmed";

  return (
    <main
      style={tenantStyle(data.settings)}
      className="relative min-h-screen overflow-x-clip bg-[var(--tenant-bg)] text-[var(--tenant-secondary)]"
    >
      <PublicHeader data={data} hideCta />
      <div className="relative mx-auto max-w-xl px-5 pt-8 pb-16">
        <Link
          href={`/${tenant}`}
          className="inline-flex items-center gap-1.5 text-sm opacity-60 transition-all hover:-translate-x-0.5 hover:opacity-100"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>

        <div className="mt-6">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-[var(--tenant-primary)] uppercase">
            <CalendarCheck2 className="size-3.5" />
            Minha reserva
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Reserva {reservation.reference}
          </h1>
        </div>

        <dl className="mt-6 divide-y divide-black/[.06] rounded-2xl border border-black/10 bg-white/70">
          <Row
            label="Status"
            value={STATUS_LABEL[reservation.status] ?? reservation.status}
          />
          <Row label="Serviço" value={reservation.serviceName ?? "—"} />
          <Row
            label="Profissional"
            value={reservation.professionalName ?? "—"}
          />
          <Row
            label="Quando"
            value={whenFormat.format(new Date(reservation.startsAt))}
          />
          {reservation.servicePrice != null ? (
            <Row
              label="Valor estimado"
              value={currency.format(Number(reservation.servicePrice))}
            />
          ) : null}
        </dl>

        {reservation.status === "pending" ? (
          <p className="mt-4 text-sm leading-6 opacity-60">
            {copy.confirmationNote}
          </p>
        ) : null}

        <div className="mt-6 space-y-3">
          {active && reservation.canCancel ? (
            <CancelReservationButton token={token} />
          ) : null}
          {active && !reservation.canCancel ? (
            <p className="rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-sm opacity-70">
              O prazo para cancelar online já passou
              {whatsapp ? " — fale direto pelo WhatsApp." : "."}
            </p>
          ) : null}
          {reservation.status === "canceled" ? (
            <Link
              href={`/${tenant}/agendar`}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--tenant-secondary)] text-[15px] font-medium text-[var(--tenant-on-secondary)] transition-opacity hover:opacity-90"
            >
              <CalendarCheck2 className="size-4.5" /> Reservar novo horário
            </Link>
          ) : null}
          {active ? (
            <Link
              href={`/${tenant}/agendar`}
              className="flex h-12 items-center justify-center gap-2 rounded-full border border-black/15 text-[15px] font-medium transition-colors hover:bg-black/[.04]"
            >
              Remarcar: cancele e reserve um novo horário
            </Link>
          ) : null}
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-full border border-black/15 text-[15px] font-medium transition-colors hover:bg-black/[.04]"
            >
              <MessageCircle className="size-4.5" />
              {copy.talkToBusiness}
            </a>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <dt className="text-sm opacity-55">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}
