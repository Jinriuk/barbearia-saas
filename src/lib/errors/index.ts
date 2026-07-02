export function publicErrorMessage(error: { message?: string } | null) {
  const code = error?.message ?? "";
  const known: Record<string, string> = {
    SLUG_UNAVAILABLE: "Esse endereço já está em uso.",
    APPOINTMENT_CONFLICT:
      "Esse horário acabou de ser reservado. Escolha outro.",
    OUTSIDE_AVAILABILITY: "O horário está fora da agenda do profissional.",
    SCHEDULE_BLOCKED: "O profissional está indisponível nesse horário.",
    BOOKING_NOTICE_REQUIRED: "Esse horário não respeita a antecedência mínima.",
  };
  return (
    known[code] ??
    "Não foi possível concluir. Revise os dados e tente novamente."
  );
}
