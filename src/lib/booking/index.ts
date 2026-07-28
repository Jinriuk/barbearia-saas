/**
 * Regras puras do fluxo público de agendamento (Fase 4 — §7.11).
 *
 * Fica fora do componente de propósito: o passo a passo, os rótulos de
 * pagamento e o arquivo de calendário são regra de produto, não de layout —
 * e assim dá para testar sem montar a árvore de React.
 */

export type BookingStepKey =
  | "service"
  | "professional"
  | "datetime"
  | "contact"
  | "extras"
  | "payment"
  | "review";

export type BookingStep = {
  key: BookingStepKey;
  /** Título da etapa, como aparece na trilha e no cabeçalho. */
  title: string;
  /** Nome curto para a trilha do desktop. */
  short: string;
  optional?: boolean;
};

const ALL_STEPS: BookingStep[] = [
  { key: "service", title: "Escolha o serviço", short: "Serviço" },
  {
    key: "professional",
    title: "Escolha o profissional",
    short: "Profissional",
  },
  {
    key: "datetime",
    title: "Escolha o dia e o horário",
    short: "Dia e horário",
  },
  { key: "contact", title: "Seus dados", short: "Seus dados" },
  {
    key: "extras",
    title: "Quer adicionar algo?",
    short: "Extras",
    optional: true,
  },
  { key: "payment", title: "Pagamento", short: "Pagamento" },
  { key: "review", title: "Confira e confirme", short: "Confirmar" },
];

/**
 * As 7 etapas do guia. A de extras só existe quando há produto para oferecer
 * — e, quando some, a numeração continua contínua (nada de "etapa 5 de 7"
 * numa página que só tem 6).
 */
export function bookingSteps(showExtras: boolean): BookingStep[] {
  return ALL_STEPS.filter((step) => showExtras || step.key !== "extras");
}

/**
 * Saldo público do produto. `null` (ou ausente, se a vitrine ainda vier de
 * uma versão antiga da RPC) significa produto SEM controle de estoque —
 * nesse caso não há o que travar nem o que avisar. Só número finito conta.
 */
export function availableUnits(stock: number | null | undefined) {
  if (stock === null || stock === undefined) return Infinity;
  const value = Number(stock);
  return Number.isFinite(value) ? value : Infinity;
}

/** Produto controlado e sem saldo: aparece como "Indisponível" (§7.10). */
export function isSoldOut(stock: number | null | undefined) {
  return availableUnits(stock) <= 0;
}

/**
 * Formas de pagamento oferecidas ao cliente final. Não existe pagamento
 * online no produto (gateway é Fase 5), então a pergunta é honesta: como
 * você prefere pagar NO LOCAL. "Decido na hora" é o padrão e vale null.
 */
export const PAYMENT_PREFERENCES = [
  { value: "pix", label: "Pix" },
  { value: "card", label: "Cartão" },
  { value: "cash", label: "Dinheiro" },
  { value: "", label: "Decido na hora" },
] as const;

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  card: "Cartão",
  cash: "Dinheiro",
  other: "Outra forma",
};

/** Rótulo do pagamento na tela final: sempre deixando claro que é no local. */
export function paymentPreferenceLabel(value: string | null | undefined) {
  const method = PAYMENT_LABELS[value ?? ""];
  return method ? `No local — ${method}` : "No local, a combinar";
}

/** Título da tela final. O guia (§8.1) fixa os dois textos. */
export function confirmationTitle(status: string) {
  return status === "confirmed"
    ? "Horário confirmado"
    : "Pedido de horário enviado";
}

/**
 * Subfrase natural da tela final: "Terça-feira, 15h, com João" — o guia pede
 * a frase falada, não um rótulo de sistema.
 */
export function confirmationPhrase({
  startsAt,
  professionalName,
  timezone,
}: {
  startsAt: string;
  professionalName: string | null;
  timezone: string;
}) {
  const date = new Date(startsAt);
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    weekday: "long",
  }).format(date);
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .split(":");
  const hour =
    parts[1] === "00" ? `${Number(parts[0])}h` : `${parts[0]}h${parts[1]}`;
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return professionalName
    ? `${capitalized}, ${hour}, com ${professionalName}`
    : `${capitalized}, ${hour}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Arquivo de calendário (.ics)

function icsEscape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 manda dobrar linhas com mais de 75 octetos. */
function icsFold(line: string) {
  if (line.length <= 75) return line;
  const chunks = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    chunks.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest) chunks.push(` ${rest}`);
  return chunks.join("\r\n");
}

function icsStamp(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/**
 * Gera o .ics da reserva. Existe porque o link do Google Calendar não
 * resolve iPhone nem Outlook — e boa parte do cliente final está no iPhone.
 */
export function buildIcsCalendar({
  uid,
  startsAt,
  endsAt,
  summary,
  description,
  location,
  confirmed,
  now = new Date(),
}: {
  uid: string;
  startsAt: string;
  endsAt: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  confirmed: boolean;
  now?: Date;
}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NexoBarber//Agendamento//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${icsEscape(uid)}`,
    `DTSTAMP:${icsStamp(now)}`,
    `DTSTART:${icsStamp(new Date(startsAt))}`,
    `DTEND:${icsStamp(new Date(endsAt))}`,
    `SUMMARY:${icsEscape(summary)}`,
    `STATUS:${confirmed ? "CONFIRMED" : "TENTATIVE"}`,
  ];
  if (description) lines.push(`DESCRIPTION:${icsEscape(description)}`);
  if (location) lines.push(`LOCATION:${icsEscape(location)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}
