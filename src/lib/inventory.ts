export const MOVEMENT_TYPES = [
  { value: "purchase", label: "Entrada — compra" },
  { value: "return", label: "Entrada — devolução" },
  { value: "adjustment_in", label: "Entrada — ajuste" },
  { value: "sale", label: "Saída — venda" },
  { value: "adjustment_out", label: "Saída — ajuste" },
  { value: "loss", label: "Saída — perda" },
] as const;
