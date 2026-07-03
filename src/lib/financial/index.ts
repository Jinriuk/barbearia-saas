export const PAYMENT_METHODS = [
  { value: "cash", label: "Dinheiro" },
  { value: "card", label: "Cartão" },
  { value: "pix", label: "PIX" },
  { value: "other", label: "Outro" },
] as const;

const labels: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.label]),
);

export function paymentMethodLabel(value: string | null | undefined): string {
  return labels[value ?? ""] ?? "—";
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(value: number): string {
  return brl.format(value);
}
