/**
 * Horário de funcionamento exibido na página pública (§7.10, seção 5).
 *
 * É texto livre por dia ("09:00–19:00", "Fechado"), escrito pelo dono em
 * Configurações. A disponibilidade real de agendamento continua vindo do
 * expediente de cada profissional — este bloco é informativo, para quem
 * quer aparecer sem marcar.
 */
export const WEEKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
  sunday: "Domingo",
};

/** Só os dias efetivamente preenchidos, na ordem da semana. */
export function openingHoursList(
  hours: Record<string, string> | null | undefined,
) {
  return WEEKDAY_KEYS.filter((key) => hours?.[key]?.trim()).map((key) => ({
    key,
    label: WEEKDAY_LABELS[key],
    value: hours![key].trim(),
  }));
}
