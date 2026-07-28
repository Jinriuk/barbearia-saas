import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { periodQuery, resolvePeriod } from "@/lib/dates/period";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import {
  FinanceNav,
  resolveFinanceSection,
} from "@/components/dashboard/finance-nav";
import { ResumoSection } from "./_sections/resumo";
import { CaixaSection } from "./_sections/caixa";
import { DespesasSection } from "./_sections/despesas";
import { AReceberSection } from "./_sections/a-receber";
import { ComissoesSection } from "./_sections/comissoes";
import { RelatoriosSection } from "./_sections/relatorios";

const descriptions: Record<string, string> = {
  resumo: "Vendido, recebido, despesas e lucro — com comparação de período.",
  caixa: "Receba os atendimentos do dia e confira quem vendeu o quê.",
  despesas: "O que sai do caixa, por categoria, e as contas em aberto.",
  "a-receber": "O que já foi vendido e ainda não entrou, com dono e cobrança.",
  comissoes: "Fechamento por profissional: produzido, vale e valor a pagar.",
  relatorios: "Origem do dinheiro e o movimento por dia e horário.",
};

/**
 * Financeiro em seis seções internas (Fase 3 — item 3.1 / §7.5).
 *
 * O que era uma página de 904 linhas mais quatro rotas soltas no menu
 * (Despesas, A receber, Comissões, Relatórios) virou um endereço só, com o
 * período escolhido sobrevivendo à troca de seção — que é o que faz o
 * fechamento de quinzena (item 3.2) ser utilizável de verdade.
 */
export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{
    secao?: string;
    periodo?: string;
    de?: string;
    ate?: string;
    pagina?: string;
  }>;
}) {
  const params = await searchParams;
  const tenant = await requireTenant();

  if (!can(tenant.role, "finance:view")) {
    return (
      <>
        <PageHeader
          eyebrow="Financeiro"
          title="Financeiro"
          description="Acompanhe os recebimentos do dia."
        />
        <EmptyState
          title="Acesso restrito"
          description="Apenas o proprietário pode ver o financeiro."
        />
      </>
    );
  }

  const section = resolveFinanceSection(params.secao);
  const period = resolvePeriod(tenant.timezone, params);
  const query = periodQuery(period);
  const supabase = await createSupabaseServerClient();
  const page = Math.max(1, Number(params.pagina) || 1);

  return (
    <>
      <PageHeader
        eyebrow="Financeiro"
        title="Financeiro"
        description={descriptions[section]}
      />

      <div className="space-y-5">
        <FinanceNav active={section} query={query} />
        <PeriodFilter
          basePath="/financeiro"
          period={period}
          hidden={{ secao: section }}
        />

        {section === "resumo" ? (
          <ResumoSection
            supabase={supabase}
            tenantId={tenant.id}
            timezone={tenant.timezone}
            period={period}
          />
        ) : null}
        {section === "caixa" ? (
          <CaixaSection
            supabase={supabase}
            tenantId={tenant.id}
            timezone={tenant.timezone}
            period={period}
          />
        ) : null}
        {section === "despesas" ? (
          <DespesasSection
            supabase={supabase}
            tenantId={tenant.id}
            timezone={tenant.timezone}
            period={period}
          />
        ) : null}
        {section === "a-receber" ? (
          <AReceberSection
            supabase={supabase}
            tenantId={tenant.id}
            timezone={tenant.timezone}
            businessName={tenant.name}
            page={page}
            sectionQuery={`secao=a-receber&${query}`}
          />
        ) : null}
        {section === "comissoes" ? (
          <ComissoesSection
            supabase={supabase}
            tenantId={tenant.id}
            timezone={tenant.timezone}
            period={period}
          />
        ) : null}
        {section === "relatorios" ? (
          <RelatoriosSection
            supabase={supabase}
            tenantId={tenant.id}
            timezone={tenant.timezone}
            period={period}
          />
        ) : null}
      </div>
    </>
  );
}
