// Central de mensagens de WhatsApp do painel. O texto fica aqui — e não
// espalhado na UI — para a automação por API oficial (fase 4) reusar o mesmo
// conteúdo que a equipe já dispara manualmente hoje.

import { whatsAppHref } from "@/lib/contact";

export type ReminderAppointment = {
  clientName: string;
  serviceName: string;
  startsAt: string | Date;
};

export type ReminderTenant = {
  name: string;
  timezone: string;
  vertical?: "barber" | "salon";
};

/**
 * Mensagem de lembrete pronta em PT-BR, no fuso do tenant e com o termo da
 * vertical (barbearia/salão). Ex.: "Oi, Ana! Passando para lembrar o seu
 * horário no salão Studio Aurora: Escova, sexta-feira, 10 de julho às 15:00."
 */
export function reminderMessage(
  appointment: ReminderAppointment,
  tenant: ReminderTenant,
): string {
  const date =
    typeof appointment.startsAt === "string"
      ? new Date(appointment.startsAt)
      : appointment.startsAt;
  const day = new Intl.DateTimeFormat("pt-BR", {
    timeZone: tenant.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  const time = new Intl.DateTimeFormat("pt-BR", {
    timeZone: tenant.timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  const firstName = appointment.clientName.trim().split(/\s+/)[0];
  const place =
    tenant.vertical === "salon"
      ? `no salão ${tenant.name}`
      : `na barbearia ${tenant.name}`;
  return (
    `Oi, ${firstName}! Passando para lembrar o seu horário ${place}: ` +
    `${appointment.serviceName}, ${day} às ${time}. ` +
    `Se precisar remarcar, é só responder por aqui. Até lá!`
  );
}

/** Link wa.me com a mensagem de lembrete pré-preenchida. */
export function reminderWhatsAppHref(
  phone: string | null | undefined,
  message: string,
): string | null {
  const base = whatsAppHref(phone);
  if (!base) return null;
  return `${base}?text=${encodeURIComponent(message)}`;
}
