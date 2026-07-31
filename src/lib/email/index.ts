import "server-only";

import { errorMessage, logError, logInfo } from "@/lib/log";

/**
 * Envio de e-mail transacional (Fase 5 §5.4).
 *
 * O provedor é um detalhe: a régua de lead, a confirmação e qualquer coisa que
 * venha depois falam com `sendEmail`. Hoje o adaptador é o Resend, escolhido
 * por ser o de menor cerimônia para um domínio próprio; trocar por SMTP ou por
 * outro provedor é escrever outro `deliver` aqui dentro.
 *
 * Sem `RESEND_API_KEY` nada é enviado e nada explode: a função devolve
 * `skipped` e quem chamou decide o que fazer. É o mesmo contrato dos lembretes
 * de WhatsApp, e é o que permite o produto rodar em produção sem o provedor
 * contratado.
 */

export type EmailResult =
  | { ok: true; skipped?: false; id?: string }
  | { ok: false; skipped: true; reason: "not_configured" }
  | { ok: false; skipped?: false; reason: string };

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  tag,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Só para o log — nunca vai no corpo. */
  tag?: string;
}): Promise<EmailResult> {
  if (!emailConfigured()) {
    return { ok: false, skipped: true, reason: "not_configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [to],
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      cache: "no-store",
    });

    const body = (await response.json().catch(() => null)) as {
      id?: string;
      message?: string;
    } | null;

    if (!response.ok) {
      const reason = body?.message ?? `HTTP ${response.status}`;
      logError("email.failed", { reason, tag: tag ?? "" });
      return { ok: false, reason };
    }
    logInfo("email.sent", { tag: tag ?? "" });
    return { ok: true, id: body?.id };
  } catch (error) {
    const reason = errorMessage(error);
    logError("email.failed", { reason, tag: tag ?? "" });
    return { ok: false, reason };
  }
}
