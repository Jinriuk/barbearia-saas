export function publicErrorMessage(error: { message?: string } | null) {
  const code = error?.message ?? "";
  const known: Record<string, string> = {
    SLUG_UNAVAILABLE: "Esse endereço já está em uso.",
    APPOINTMENT_CONFLICT:
      "Esse horário acabou de ser reservado. Escolha outro.",
    OUTSIDE_AVAILABILITY: "O horário está fora da agenda do profissional.",
    SCHEDULE_BLOCKED: "O profissional está indisponível nesse horário.",
    BOOKING_NOTICE_REQUIRED: "Esse horário não respeita a antecedência mínima.",
    BOOKING_HORIZON_EXCEEDED:
      "Esse dia ainda não está aberto para reservas. Escolha uma data mais próxima.",
    CANCELLATION_NOTICE_REQUIRED:
      "O prazo para cancelar online já passou. Fale direto com o estabelecimento.",
    TOO_MANY_PENDING:
      "Esse telefone já tem reservas em aberto. Fale com a barbearia para ajustar.",
    // Fase 4 — trava de estoque e autogestão da reserva pelo cliente.
    PRODUCT_UNAVAILABLE:
      "Um dos produtos escolhidos acabou de esgotar. Remova o item e confirme de novo.",
    APPOINTMENT_NOT_FOUND: "Reserva não encontrada.",
    INVALID_STATUS_TRANSITION: "Essa reserva não pode mais ser alterada.",
    INVALID_CLIENT_NAME: "Escreva o nome completo.",
    INVALID_PHONE: "Revise o número do WhatsApp.",
  };
  return (
    known[code] ??
    "Não foi possível concluir. Revise os dados e tente novamente."
  );
}
