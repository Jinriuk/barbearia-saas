/**
 * Máscaras de entrada do §5.2 (Fase 1.10).
 *
 * O repositório não tinha nenhuma: telefone, dinheiro, hora e percentual
 * eram campos de texto livre. As funções aqui são puras e sem estado — o
 * componente MaskedInput só as chama a cada tecla — para poderem ser
 * testadas e reusadas também no servidor.
 *
 * Regra comum a todas: `format` nunca rejeita o que o usuário digitou, só
 * apara o excesso. Rejeitar tecla no meio da digitação é o que faz máscara
 * parecer travada.
 */

/** Só os dígitos, na ordem em que aparecem. */
export function onlyDigits(value: string): string {
  return value.replace(/\D+/g, "");
}

/**
 * Telefone brasileiro: (11) 98765-4321 no celular e (11) 3456-7890 no fixo.
 * O oitavo dígito decide o corte, então o formato se ajusta sozinho enquanto
 * a pessoa digita.
 */
export function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const split = rest.length > 8 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/** Desfaz formatPhone: guarda só os dígitos. */
export function unformatPhone(value: string): string {
  return onlyDigits(value).slice(0, 11);
}

/**
 * Dinheiro em reais, digitado da direita para a esquerda: cada tecla empurra
 * a vírgula, como em caixa registradora. "1234" vira "12,34".
 */
export function formatCurrency(value: string): string {
  const digits = onlyDigits(value).slice(0, 12);
  if (digits.length === 0) return "";
  const cents = Number(digits);
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Valor numérico de um campo de moeda formatado, em reais.
 * Devolve null quando o campo está vazio ou ilegível — quem chama decide se
 * isso é erro de validação ou campo opcional.
 */
export function parseCurrency(value: string): number | null {
  const digits = onlyDigits(value);
  if (digits.length === 0) return null;
  return Number(digits) / 100;
}

/**
 * Hora do dia em HH:MM. Aceita a digitação corrida ("930" → "09:30") e
 * limita a 23:59 — o campo é de expediente, não de duração.
 */
export function formatTime(value: string): string {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;
  const rawHour = digits.slice(0, 2);
  const rawMinute = digits.slice(2);
  const hour = Math.min(23, Number(rawHour));
  const minute = Math.min(59, Number(rawMinute.padEnd(2, "0")));
  const shownMinute =
    rawMinute.length === 1
      ? String(Math.min(5, Number(rawMinute)))
      : String(minute).padStart(2, "0");
  return `${String(hour).padStart(2, "0")}:${shownMinute}`;
}

/**
 * Percentual com no máximo duas casas, travado em 100. Serve para comissão,
 * desconto e margem, que são os três usos do painel.
 */
export function formatPercent(value: string): string {
  const cleaned = value.replace(/[^\d,.]/g, "").replace(".", ",");
  if (cleaned === "") return "";
  const [whole = "", fraction] = cleaned.split(",");
  const bounded = whole === "" ? "" : String(Math.min(100, Number(whole)));
  if (fraction === undefined) return bounded;
  if (bounded === "100") return "100";
  return `${bounded || "0"},${fraction.slice(0, 2)}`;
}

/** Valor numérico de um campo de percentual. Null quando vazio. */
export function parsePercent(value: string): number | null {
  const normalized = value.replace(/[^\d,.]/g, "").replace(",", ".");
  if (normalized === "") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.min(100, parsed) : null;
}

export const MASKS = {
  phone: formatPhone,
  currency: formatCurrency,
  time: formatTime,
  percent: formatPercent,
} as const;

export type MaskName = keyof typeof MASKS;
