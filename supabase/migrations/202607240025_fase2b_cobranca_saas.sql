-- Fase 2B — Cobrança do SaaS: catálogo de preços no banco, registro
-- idempotente de eventos de pagamento e captura de leads.
--
-- 1) plan_prices: o preço deixa de viver só em constantes do frontend.
--    Versionado por vigência (valid_from) — mudar preço = inserir nova
--    versão, nunca editar a antiga. O anual equivale a 10 mensalidades
--    (hipótese comercial do plano, §8.1).
-- 2) billing_events: todo evento de webhook é registrado com
--    provider_event_id ÚNICO — reprocessar o mesmo evento não duplica
--    pagamento nem reativa assinatura duas vezes.
-- 3) saas_leads: captura opcional de lead antes do checkout (§8.5), com
--    consentimento e UTMs; deduplicação por contato é feita na leitura
--    (o histórico nunca é apagado). Lead NÃO cria conta.
--
-- O provedor de pagamento ainda não está integrado — o webhook valida
-- assinatura HMAC + evento registrado + preço conferido no catálogo; a
-- busca do evento no provedor entra quando houver provedor contratado.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Catálogo de preços.
create table if not exists public.plan_prices (
  id uuid primary key default gen_random_uuid(),
  plan text not null check (plan in ('starter', 'plus')),
  period text not null check (period in ('monthly', 'yearly')),
  price_cents integer not null check (price_cents > 0),
  currency text not null default 'BRL',
  version integer not null default 1,
  valid_from timestamptz not null default now(),
  active boolean not null default true,
  benefits jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint plan_prices_version_key unique (plan, period, version)
);

alter table public.plan_prices enable row level security;
-- Catálogo é público (landing e página de assinatura leem sem login).
drop policy if exists "catalog is public" on public.plan_prices;
create policy "catalog is public"
on public.plan_prices for select to anon, authenticated
using (active);

-- Preços vigentes (mesma hipótese comercial já usada no app: Padrão 49,90 e
-- Plus 99,90; anual = 10 mensalidades).
insert into public.plan_prices (plan, period, price_cents, version)
select v.plan, v.period, v.price_cents, 1
from (values
  ('starter', 'monthly', 4990),
  ('starter', 'yearly', 49900),
  ('plus', 'monthly', 9990),
  ('plus', 'yearly', 99900)
) as v(plan, period, price_cents)
where not exists (
  select 1 from public.plan_prices p
  where p.plan = v.plan and p.period = v.period
);

-- Versão vigente de cada plano/periodicidade em uma chamada.
create or replace function public.get_plan_catalog()
returns table (
  plan text,
  period text,
  price_cents integer,
  currency text,
  version integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct on (plan, period)
    plan, period, price_cents, currency, version
  from public.plan_prices
  where active and valid_from <= now()
  order by plan, period, version desc;
$$;
grant execute on function public.get_plan_catalog() to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Eventos de cobrança (webhook) — idempotência por provider_event_id.
create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'generic',
  provider_event_id text not null,
  event_type text not null,
  barbershop_id uuid references public.barbershops(id) on delete set null,
  -- payload sem PII sensível: o handler descarta campos de cartão/documento.
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received'
    check (status in ('received', 'processed', 'ignored', 'failed')),
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint billing_events_provider_event_key unique (provider, provider_event_id)
);

alter table public.billing_events enable row level security;
-- Sem policies: apenas service_role (webhook/cron) lê e escreve.

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Leads do SaaS (captura opcional pré-checkout).
create table if not exists public.saas_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  contact text not null check (char_length(contact) between 5 and 160),
  contact_normalized text not null,
  channel text not null check (channel in ('whatsapp', 'email')),
  consent boolean not null default false,
  plan_interest text check (plan_interest in ('starter', 'plus')),
  period_interest text check (period_interest in ('monthly', 'yearly')),
  vertical text not null default 'barber' check (vertical in ('barber', 'salon')),
  utm jsonb not null default '{}'::jsonb,
  source_page text,
  funnel_stage text not null default 'lead_submitted',
  created_at timestamptz not null default now()
);

create index if not exists saas_leads_contact_idx
  on public.saas_leads (contact_normalized, created_at desc);

alter table public.saas_leads enable row level security;
-- Sem policies: escrita apenas via service_role (rota com rate limit).

commit;
