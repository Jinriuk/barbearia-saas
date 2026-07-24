import { z } from "zod";
import { requestIp, sharedRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { errorMessage, logError } from "@/lib/log";

export const dynamic = "force-dynamic";

const leadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  contact: z.string().trim().min(5).max(160),
  channel: z.enum(["whatsapp", "email"]),
  consent: z.literal(true),
  planInterest: z.enum(["starter", "plus"]).optional(),
  periodInterest: z.enum(["monthly", "yearly"]).optional(),
  vertical: z.enum(["barber", "salon"]).default("barber"),
  utm: z.record(z.string(), z.string().max(200)).default({}),
  sourcePage: z.string().max(200).optional(),
});

/**
 * Captura de lead do SaaS (Fase 2B §8.5): opcional, com consentimento
 * explícito. O lead NUNCA cria conta nem assinatura — só registra interesse
 * (com UTMs) para a régua comercial da Fase 5. Deduplicação é feita na
 * leitura por contato normalizado; o histórico não é apagado.
 */
export async function POST(request: Request) {
  if (!(await sharedRateLimit(`lead:${requestIp(request)}`, 5, 60_000))) {
    return Response.json(
      { error: "Muitas tentativas. Aguarde um minuto." },
      { status: 429 },
    );
  }
  const parsed = leadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Revise nome, contato e consentimento." },
      { status: 400 },
    );
  }
  const lead = parsed.data;
  const normalized =
    lead.channel === "whatsapp"
      ? lead.contact.replace(/\D/g, "")
      : lead.contact.trim().toLowerCase();
  if (normalized.length < 5) {
    return Response.json({ error: "Contato inválido." }, { status: 400 });
  }

  // Só UTMs conhecidas, sem payload arbitrário.
  const utm = Object.fromEntries(
    Object.entries(lead.utm).filter(([key]) =>
      ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].includes(key),
    ),
  );

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("saas_leads").insert({
    name: lead.name,
    contact: lead.contact,
    contact_normalized: normalized,
    channel: lead.channel,
    consent: true,
    plan_interest: lead.planInterest ?? null,
    period_interest: lead.periodInterest ?? null,
    vertical: lead.vertical,
    utm,
    source_page: lead.sourcePage ?? null,
  });
  if (error) {
    logError("leads.persist_failed", { message: errorMessage(error) });
    return Response.json({ error: "Não foi possível registrar." }, { status: 500 });
  }
  return Response.json({ ok: true }, { status: 201 });
}
