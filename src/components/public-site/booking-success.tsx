import {
  CalendarCheck2,
  CalendarClock,
  Check,
  Clock3,
  MessageCircle,
} from "lucide-react";
import {
  confirmationPhrase,
  confirmationTitle,
  paymentPreferenceLabel,
} from "@/lib/booking";
import { verticalCopy } from "@/lib/verticals";
import type { PublicAppointment } from "@/types/domain";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Tela final do agendamento (§7.11). Tudo aqui vem do que o servidor GRAVOU
 * — a API devolve a reserva inteira desde a Fase 4. Antes, esta tela era
 * montada com o estado do navegador e podia mostrar um pedido que o banco
 * recusou em parte.
 */
export function BookingSuccess({
  tenant,
  appointment,
  timezone,
  whatsappHref,
  vertical,
}: {
  tenant: string;
  appointment: PublicAppointment;
  timezone: string;
  whatsappHref: string | null;
  vertical?: "barber" | "salon";
}) {
  const copy = verticalCopy(vertical);
  const confirmed = appointment.status === "confirmed";
  const startsAt = new Date(appointment.startsAt);

  return (
    <div className="overflow-hidden rounded-3xl border border-black/10 bg-white/60">
      <div className="px-6 pt-12 pb-8 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--tenant-primary)] text-[var(--tenant-on-primary)]">
          {confirmed ? (
            <Check className="size-8" strokeWidth={2.5} />
          ) : (
            <Clock3 className="size-8" strokeWidth={2.5} />
          )}
        </span>
        <h2 className="mt-6 text-2xl font-semibold tracking-tight">
          {confirmationTitle(appointment.status)}
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-base font-medium">
          {confirmationPhrase({
            startsAt: appointment.startsAt,
            professionalName: appointment.professionalName,
            timezone,
          })}
        </p>
        {confirmed ? null : (
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 opacity-60">
            {copy.pendingNote}
          </p>
        )}
      </div>

      <div className="px-5 pb-6">
        <dl className="divide-y divide-black/[.06] rounded-2xl border border-black/10 bg-white/70">
          {appointment.reference ? (
            <Row label="Referência" value={appointment.reference} />
          ) : null}
          <Row
            label="Situação"
            value={confirmed ? "Confirmada" : "Aguardando confirmação"}
          />
          <Row label="Serviço" value={appointment.serviceName ?? "—"} />
          <Row
            label="Profissional"
            value={appointment.professionalName ?? "—"}
          />
          <Row
            label="Quando"
            value={`${new Intl.DateTimeFormat("pt-BR", {
              timeZone: timezone,
              weekday: "long",
              day: "2-digit",
              month: "long",
            }).format(startsAt)}, ${new Intl.DateTimeFormat("pt-BR", {
              timeZone: timezone,
              hour: "2-digit",
              minute: "2-digit",
            }).format(startsAt)}`}
          />
          {appointment.products.map((item) => (
            <Row
              key={item.name}
              label={`${item.name} × ${item.quantity}`}
              value={currency.format(Number(item.unitPrice) * item.quantity)}
            />
          ))}
          <Row
            label="Pagamento"
            value={paymentPreferenceLabel(appointment.paymentPreference)}
          />
          <div className="flex items-center justify-between px-4 py-3.5">
            <dt className="text-sm font-semibold">Total</dt>
            <dd className="font-mono text-base font-semibold">
              {currency.format(Number(appointment.total))}
            </dd>
          </div>
        </dl>

        <div className="mt-4 space-y-3">
          {appointment.token ? (
            <a
              href={`/api/public/${tenant}/reserva/${appointment.token}/ics`}
              className="flex h-12 items-center justify-center gap-2 rounded-full border border-black/15 text-[15px] font-medium transition-colors hover:bg-black/[.04]"
            >
              <CalendarCheck2 className="size-4.5" />
              Adicionar ao calendário
            </a>
          ) : null}
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-full border border-black/15 text-[15px] font-medium transition-colors hover:bg-black/[.04]"
            >
              <MessageCircle className="size-4.5" />
              {copy.talkToBusiness}
            </a>
          ) : null}
          {appointment.token ? (
            <a
              href={`/${tenant}/reserva/${appointment.token}`}
              className="flex h-12 items-center justify-center gap-2 rounded-full border border-black/15 text-[15px] font-medium transition-colors hover:bg-black/[.04]"
            >
              <CalendarClock className="size-4.5" />
              Remarcar ou cancelar
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <dt className="text-sm opacity-55">{label}</dt>
      <dd className="text-right text-sm font-medium first-letter:uppercase">
        {value}
      </dd>
    </div>
  );
}
