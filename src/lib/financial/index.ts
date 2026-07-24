export const PAYMENT_METHODS = [
  { value: "cash", label: "Dinheiro" },
  { value: "card", label: "Cartão" },
  { value: "pix", label: "PIX" },
  { value: "other", label: "Outro" },
] as const;

const labels: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.label]),
);

/**
 * Rótulo da forma de pagamento. Transações pagas antes da Fase 0 podem não
 * ter o método registrado — elas aparecem como "Não informado" (regra do
 * plano: meio de pagamento desconhecido nunca vira traço ou cor).
 */
export function paymentMethodLabel(value: string | null | undefined): string {
  return labels[value ?? ""] ?? "Não informado";
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(value: number): string {
  return brl.format(value);
}
