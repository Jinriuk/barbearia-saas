import "server-only";

import type { ReminderParts } from "@/lib/whatsapp";

// Cliente mínimo da API oficial do WhatsApp (Meta Cloud API), usado pelo
// cron de lembretes. O remetente é o número CENTRAL da plataforma: sem as
// envs abaixo, nada é enviado — o botão manual (wa.me) continua funcionando.
//
// Envs (ver .env.example):
//   WHATSAPP_ACCESS_TOKEN      token permanente de system user do Meta Business
//   WHATSAPP_PHONE_NUMBER_ID   id do número na WABA (não é o telefone em si)
//   WHATSAPP_REMINDER_TEMPLATE nome do template aprovado (padrão: lembrete_horario)

const GRAPH_BASE = "https://graph.facebook.com/v23.0";

export function whatsAppCloudConfigured() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
  );
}

/**
 * Dispara o template de lembrete para um número (formato internacional, só
 * dígitos). As cinco variáveis do corpo são os ReminderParts, na ordem:
 * {{1}} nome · {{2}} local · {{3}} serviço · {{4}} dia · {{5}} hora.
 */
export async function sendReminderTemplate(
  to: string,
  parts: ReminderParts,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { ok: false, error: "WHATSAPP_* não configurado" };
  }
  const template = process.env.WHATSAPP_REMINDER_TEMPLATE ?? "lembrete_horario";

  try {
    const response = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: "pt_BR" },
          components: [
            {
              type: "body",
              parameters: [
                parts.firstName,
                parts.place,
                parts.serviceName,
                parts.day,
                parts.time,
              ].map((text) => ({ type: "text", text })),
            },
          ],
        },
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      return {
        ok: false,
        error: body?.error?.message ?? `HTTP ${response.status}`,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Falha de rede ao chamar a Graph API." };
  }
}
