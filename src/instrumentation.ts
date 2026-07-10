import type { Instrumentation } from "next";
import { errorMessage, logError } from "@/lib/log";

/**
 * Captura central de erros do servidor (render, route handlers, server
 * actions e proxy). Tudo vira log estruturado nos logs da Vercel e, se
 * ERROR_WEBHOOK_URL estiver definida, um POST simples de alerta — funciona
 * com Slack/Discord/qualquer coletor, sem SDK. O `digest` é o mesmo exibido
 * na tela de erro, então dá para casar o relato do usuário com o log.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String((error as { digest: unknown }).digest)
      : undefined;

  const payload = {
    message: errorMessage(error),
    digest,
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
  };

  logError("server.unhandled", payload);

  const webhook = process.env.ERROR_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // "content" (Discord) e "text" (Slack) juntos: o webhook usa o que
          // conhecer e ignora o resto.
          content: `🔥 Erro em produção: ${payload.message} (${payload.method} ${payload.path}, digest ${digest ?? "n/a"})`,
          text: `🔥 Erro em produção: ${payload.message} (${payload.method} ${payload.path}, digest ${digest ?? "n/a"})`,
        }),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // Alerta é melhor-esforço: nunca pode derrubar o tratamento do erro.
    }
  }
};
