import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { emailConfigured } from "@/lib/email";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leads — NexoBarber" };

const PAGE_SIZE = 50;

const STAGE_LABEL: Record<string, string> = {
  lead_submitted: "Aguardando contato",
  nurture_24h_sent: "1º e-mail enviado",
  nurture_72h_sent: "Oferta enviada",
  converted: "Virou cliente",
  opted_out: "Pediu descadastro",
};

const STAGE_TONE: Record<string, string> = {
  lead_submitted: "border-warning/40 text-warning",
  nurture_24h_sent: "border-primary/40 text-primary",
  nurture_72h_sent: "border-primary/40 text-primary",
  converted: "border-success/40 text-success",
  opted_out: "text-muted-foreground",
};

type LeadRow = {
  id: string;
  name: string;
  contact: string;
  channel: "whatsapp" | "email";
  vertical: string;
  plan_interest: string | null;
  period_interest: string | null;
  funnel_stage: string;
  created_at: string;
  converted_at: string | null;
  opt_out_at: string | null;
  nurture_24h_at: string | null;
  nurture_72h_at: string | null;
  coupon_code: string | null;
  last_delivery_error: string | null;
  utm: Record<string, string> | null;
  source_page: string | null;
};

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Quem pediu contato (Fase 5 §5.4).
 *
 * Antes desta tela o lead entrava em `saas_leads` e ninguém no time conseguia
 * nem VER quem havia preenchido o formulário sem abrir o SQL do Supabase —
 * era o pedido do sócio que estava mais longe de ser atendido, apesar de o
 * dado já estar lá desde a Fase 2B.
 */
export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; page?: string }>;
}) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const stage = params.stage ?? "";
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("saas_leads")
    .select(
      "id,name,contact,channel,vertical,plan_interest,period_interest,funnel_stage,created_at,converted_at,opt_out_at,nurture_24h_at,nurture_72h_at,coupon_code,last_delivery_error,utm,source_page",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (stage) query = query.eq("funnel_stage", stage);

  const { data, count } = await query;
  const leads = (data ?? []) as unknown as LeadRow[];
  const total = count ?? 0;
  const showing = leads.length;

  const { count: waiting } = await supabase
    .from("saas_leads")
    .select("id", { count: "exact", head: true })
    .eq("funnel_stage", "lead_submitted");
  const { count: converted } = await supabase
    .from("saas_leads")
    .select("id", { count: "exact", head: true })
    .not("converted_at", "is", null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-1 -ml-2">
            <Link href="/admin">
              <ArrowLeft className="size-4" /> Barbearias
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            Quem pediu contato
          </h1>
          <p className="text-muted-foreground text-sm">
            {total} {total === 1 ? "lead" : "leads"} no total · {waiting ?? 0}{" "}
            aguardando primeiro contato · {converted ?? 0} viraram cliente.
          </p>
        </div>
      </div>

      {!emailConfigured() ? (
        <Alert variant="warning">
          <AlertTitle>Régua de e-mail desligada</AlertTitle>
          <AlertDescription>
            Sem <code>RESEND_API_KEY</code> e <code>EMAIL_FROM</code>{" "}
            configuradas, o cron diário não envia nada — os leads continuam
            sendo capturados e ficam aqui, mas ninguém é contatado
            automaticamente.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <StageFilter current={stage} value="" label="Todos" />
        {Object.entries(STAGE_LABEL).map(([value, label]) => (
          <StageFilter
            key={value}
            current={stage}
            value={value}
            label={label}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {showing === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              Nenhum lead nesta situação.
            </p>
          ) : (
            <>
              {/* Celular: cartões. Computador: tabela. */}
              <ul className="divide-y md:hidden">
                {leads.map((lead) => (
                  <li key={lead.id} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                          {lead.channel === "email" ? (
                            <Mail className="size-3.5" />
                          ) : (
                            <MessageCircle className="size-3.5" />
                          )}
                          {lead.contact}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={STAGE_TONE[lead.funnel_stage] ?? ""}
                      >
                        {STAGE_LABEL[lead.funnel_stage] ?? lead.funnel_stage}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {formatDateTime(lead.created_at)} ·{" "}
                      {lead.vertical === "salon" ? "Salão" : "Barbearia"}
                      {lead.plan_interest ? ` · ${lead.plan_interest}` : ""}
                      {lead.utm?.utm_source ? ` · ${lead.utm.utm_source}` : ""}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground text-left text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">Quem</th>
                      <th className="px-4 py-3 font-medium">Contato</th>
                      <th className="px-4 py-3 font-medium">Entrou</th>
                      <th className="px-4 py-3 font-medium">Situação</th>
                      <th className="px-4 py-3 font-medium">Régua</th>
                      <th className="px-4 py-3 font-medium">Origem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {lead.vertical === "salon" ? "Salão" : "Barbearia"}
                            {lead.plan_interest
                              ? ` · ${lead.plan_interest}`
                              : ""}
                            {lead.period_interest
                              ? ` · ${lead.period_interest === "yearly" ? "anual" : "mensal"}`
                              : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5">
                            {lead.channel === "email" ? (
                              <Mail className="size-3.5 shrink-0" />
                            ) : (
                              <MessageCircle className="size-3.5 shrink-0" />
                            )}
                            {lead.channel === "email" ? (
                              <a
                                href={`mailto:${lead.contact}`}
                                className="underline-offset-2 hover:underline"
                              >
                                {lead.contact}
                              </a>
                            ) : (
                              <a
                                href={`https://wa.me/${lead.contact.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline-offset-2 hover:underline"
                              >
                                {lead.contact}
                              </a>
                            )}
                          </span>
                        </td>
                        <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                          {formatDateTime(lead.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={STAGE_TONE[lead.funnel_stage] ?? ""}
                          >
                            {STAGE_LABEL[lead.funnel_stage] ??
                              lead.funnel_stage}
                          </Badge>
                          {lead.last_delivery_error ? (
                            <p className="text-destructive mt-1 text-xs">
                              Falha no envio: {lead.last_delivery_error}
                            </p>
                          ) : null}
                        </td>
                        <td className="text-muted-foreground px-4 py-3 text-xs whitespace-nowrap">
                          <p>24h: {formatDateTime(lead.nurture_24h_at)}</p>
                          <p>72h: {formatDateTime(lead.nurture_72h_at)}</p>
                          {lead.coupon_code ? (
                            <p className="text-primary">
                              Cupom {lead.coupon_code}
                            </p>
                          ) : null}
                        </td>
                        <td className="text-muted-foreground px-4 py-3 text-xs">
                          {lead.utm?.utm_source ?? "direto"}
                          {lead.utm?.utm_campaign
                            ? ` · ${lead.utm.utm_campaign}`
                            : ""}
                          {lead.source_page ? (
                            <p className="truncate">{lead.source_page}</p>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {total > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Mostrando {from + 1}–{from + showing} de {total}.
          </p>
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page === 1}
              aria-disabled={page === 1}
            >
              <Link
                href={`/admin/leads?${new URLSearchParams({
                  ...(stage ? { stage } : {}),
                  page: String(Math.max(1, page - 1)),
                })}`}
              >
                Anterior
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/admin/leads?${new URLSearchParams({
                  ...(stage ? { stage } : {}),
                  page: String(page + 1),
                })}`}
              >
                Próxima
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StageFilter({
  current,
  value,
  label,
}: {
  current: string;
  value: string;
  label: string;
}) {
  const active = current === value;
  return (
    <Button
      asChild
      size="sm"
      variant={active ? "default" : "outline"}
      aria-current={active ? "page" : undefined}
    >
      <Link href={value ? `/admin/leads?stage=${value}` : "/admin/leads"}>
        {label}
      </Link>
    </Button>
  );
}
