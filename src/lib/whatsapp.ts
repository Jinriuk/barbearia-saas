// Central de mensagens de WhatsApp do painel. O texto fica aqui — e não
// espalhado na UI — para o disparo manual (wa.me) e o automático (API
// oficial, cron de lembretes) usarem exatamente o mesmo conteúdo.

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

/** Pedaços do lembrete — viram variáveis do template da API oficial. */
export type ReminderParts = {
  firstName: string;
  place: string;
  serviceName: string;
  day: string;
  time: string;
};

/**
 * Quebra o lembrete nos pedaços que o template aprovado na Meta espera
 * ({{1}}..{{5}}), no fuso do tenant e com o termo da vertical.
 */
export function reminderParts(
  appointment: ReminderAppointment,
  tenant: ReminderTenant,
): ReminderParts {
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
  return {
    firstName: appointment.clientName.trim().split(/\s+/)[0],
    place:
      tenant.vertical === "salon"
        ? `no salão ${tenant.name}`
        : `na barbearia ${tenant.name}`,
    serviceName: appointment.serviceName,
    day,
    time,
  };
}

/**
 * Mensagem de lembrete pronta em PT-BR. Ex.: "Oi, Ana! Passando para lembrar
 * o seu horário no salão Studio Aurora: Escova, sexta-feira, 10 de julho às
 * 15:00." — o mesmo texto do template `lembrete_horario` da API oficial.
 */
export function reminderMessage(
  appointment: ReminderAppointment,
  tenant: ReminderTenant,
): string {
  const parts = reminderParts(appointment, tenant);
  return (
    `Oi, ${parts.firstName}! Passando para lembrar o seu horário ${parts.place}: ` +
    `${parts.serviceName}, ${parts.day} às ${parts.time}. ` +
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
