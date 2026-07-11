/**
 * Logger estruturado do servidor: uma linha JSON por evento, que a Vercel
 * indexa e permite filtrar (level, event). É a trilha mínima de auditoria
 * enquanto não há um APM dedicado — nada de console.log solto pelo código.
 */
type Level = "info" | "warn" | "error";

function emit(level: Level, event: string, data?: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    event,
    ts: new Date().toISOString(),
    ...data,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function logInfo(event: string, data?: Record<string, unknown>) {
  emit("info", event, data);
}

export function logWarn(event: string, data?: Record<string, unknown>) {
  emit("warn", event, data);
}

export function logError(event: string, data?: Record<string, unknown>) {
  emit("error", event, data);
}

/** Mensagem segura a partir de um unknown (erros do Supabase, exceções…). */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}
