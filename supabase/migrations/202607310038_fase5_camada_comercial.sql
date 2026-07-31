-- Fase 5 — a camada comercial (docs/14-plano-de-fases.md §5.1 a §5.9).
--
-- 1) subscriptions ganha periodicidade. Até aqui o sistema não conseguia
--    sustentar uma assinatura anual: o preço anual existia no catálogo desde a
--    Fase 2B, mas a assinatura não sabia dizer o que tinha sido comprado, e o
--    período era sempre somado como mensal.
-- 2) billing_checkouts: a intenção de compra vira registro ANTES de o
--    visitante sair para o gateway. O webhook não confia no payload do
--    provedor para saber plano, periodicidade e valor — ele lê daqui, pela
--    referência externa que ele mesmo gravou.
-- 3) coupons/coupon_redemptions: sem entidade de cupom a "oferta imperdível
--    no anual" da apresentação não tinha como ser aplicada (§5.3), e a régua
--    de lead (§5.4) não tinha o que oferecer.
-- 4) Preços: o mensal sobe (Padrão 49,90 → 59,90; Plus 99,90 → 119,90) e o
--    anual fica onde estava. Era o §5.2: enquanto o anual fosse exatamente 10
--    mensalidades do preço-base, não existia desconto — existia só um preço
--    anual. Versão 2 do catálogo; a versão 1 fica no histórico, porque
--    plan_prices é versionado por vigência e quem já assina não é retarifado
--    (subscriptions.price_cents é o preço travado da assinatura).
-- 5) saas_leads ganha o rastro da régua: quando cada e-mail saiu, se o lead
--    converteu e com que cupom. O campo funnel_stage existia desde a Fase 2B
--    e nunca era escrito por ninguém.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Periodicidade da assinatura.
alter table public.subscriptions
  add column if not exists billing_period text not null default 'monthly';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_billing_period_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_billing_period_check
      check (billing_period in ('monthly', 'yearly'));
  end if;
end $$;

comment on column public.subscriptions.billing_period is
  'Periodicidade contratada. Define quantos dias cada pagamento compra (30 ou 365).';

-- Nenhuma assinatura anual foi vendida antes desta migração (não havia como),
-- então o default monthly já descreve o passado. O que existe de anual é o
-- preço no catálogo, não assinatura.

alter table public.subscriptions
  add column if not exists coupon_code text,
  add column if not exists discount_cents integer not null default 0
    check (discount_cents >= 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Cupons.
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text,
  kind text not null check (kind in ('percent', 'fixed')),
  -- percent: 1 a 90 (%). fixed: desconto em centavos.
  value integer not null check (value > 0),
  applies_to_plan text check (applies_to_plan in ('starter', 'plus')),
  applies_to_period text check (applies_to_period in ('monthly', 'yearly')),
  -- Desconto só na primeira cobrança (padrão) ou em toda renovação.
  first_period_only boolean not null default true,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint coupons_code_key unique (code),
  constraint coupons_percent_range
    check (kind <> 'percent' or value between 1 and 90)
);

alter table public.coupons enable row level security;
-- Sem policy: o cupom nunca é listado para o público. A conferência acontece
-- por RPC security definer, que devolve só o veredito de UM código informado —
-- listar a tabela entregaria o catálogo inteiro de descontos a qualquer um.

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  code text not null,
  discount_cents integer not null check (discount_cents >= 0),
  plan text not null,
  period text not null,
  redeemed_at timestamptz not null default now(),
  constraint coupon_redemptions_once unique (coupon_id, barbershop_id)
);

alter table public.coupon_redemptions enable row level security;
-- Sem policy: só service_role (checkout e webhook) escreve e lê.

create index if not exists coupon_redemptions_barbershop_idx
  on public.coupon_redemptions (barbershop_id, redeemed_at desc);

/**
 * Confere um código e calcula o desconto sobre o preço vigente do catálogo.
 *
 * security definer porque a tabela é fechada: o visitante precisa saber se o
 * SEU código vale, sem poder ler os outros. Devolve sempre uma linha — com
 * valid=false e um motivo — para que a tela nunca precise distinguir "código
 * errado" de "erro de banco".
 */
create or replace function public.validate_coupon(
  p_code text,
  p_plan text,
  p_period text
)
returns table (
  valid boolean,
  reason text,
  code text,
  description text,
  kind text,
  discount_cents integer,
  first_period_only boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_coupon public.coupons%rowtype;
  v_price integer;
  v_discount integer;
begin
  if p_plan not in ('starter', 'plus') or p_period not in ('monthly', 'yearly') then
    return query select false, 'INVALID_TARGET', null::text, null::text, null::text, 0, null::boolean;
    return;
  end if;

  select * into v_coupon
  from public.coupons c
  where c.code = upper(btrim(coalesce(p_code, '')));

  if v_coupon.id is null then
    return query select false, 'NOT_FOUND', null::text, null::text, null::text, 0, null::boolean;
    return;
  end if;

  if not v_coupon.active
     or v_coupon.valid_from > now()
     or (v_coupon.valid_until is not null and v_coupon.valid_until <= now()) then
    return query select false, 'EXPIRED', null::text, null::text, null::text, 0, null::boolean;
    return;
  end if;

  if v_coupon.max_redemptions is not null
     and v_coupon.redemption_count >= v_coupon.max_redemptions then
    return query select false, 'EXHAUSTED', null::text, null::text, null::text, 0, null::boolean;
    return;
  end if;

  if (v_coupon.applies_to_plan is not null and v_coupon.applies_to_plan <> p_plan)
     or (v_coupon.applies_to_period is not null and v_coupon.applies_to_period <> p_period) then
    return query select false, 'NOT_APPLICABLE', null::text, null::text, null::text, 0, null::boolean;
    return;
  end if;

  select pc.price_cents into v_price
  from public.get_plan_catalog() pc
  where pc.plan = p_plan and pc.period = p_period;

  if v_price is null then
    return query select false, 'PRICE_NOT_FOUND', null::text, null::text, null::text, 0, null::boolean;
    return;
  end if;

  v_discount := case
    when v_coupon.kind = 'percent' then (v_price * v_coupon.value) / 100
    else least(v_coupon.value, v_price)
  end;

  -- Nunca deixa a cobrança em zero: gateway recusa e o dono fica sem plano.
  v_discount := least(v_discount, v_price - 100);
  if v_discount < 0 then
    v_discount := 0;
  end if;

  return query select
    true,
    'OK',
    v_coupon.code,
    v_coupon.description,
    v_coupon.kind,
    v_discount,
    v_coupon.first_period_only;
end;
$$;

revoke all on function public.validate_coupon(text, text, text) from public;
grant execute on function public.validate_coupon(text, text, text) to anon, authenticated;

/**
 * Marca o cupom como usado por uma barbearia. Chamado pelo servidor no
 * momento em que o pagamento é confirmado — nunca no clique.
 *
 * A contagem sobe na mesma transação do registro do resgate, então dois
 * pagamentos simultâneos não estouram max_redemptions, e o unique
 * (coupon_id, barbershop_id) garante que reprocessar o mesmo webhook não
 * conta duas vezes.
 */
create or replace function public.redeem_coupon(
  p_code text,
  p_barbershop uuid,
  p_plan text,
  p_period text,
  p_discount_cents integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.coupons%rowtype;
begin
  select * into v_coupon
  from public.coupons c
  where c.code = upper(btrim(coalesce(p_code, '')))
  for update;

  if v_coupon.id is null then
    return false;
  end if;

  insert into public.coupon_redemptions
    (coupon_id, barbershop_id, code, discount_cents, plan, period)
  values
    (v_coupon.id, p_barbershop, v_coupon.code, greatest(coalesce(p_discount_cents, 0), 0), p_plan, p_period)
  on conflict (coupon_id, barbershop_id) do nothing;

  if not found then
    return false;
  end if;

  update public.coupons
  set redemption_count = redemption_count + 1
  where id = v_coupon.id;

  return true;
end;
$$;

revoke all on function public.redeem_coupon(text, uuid, text, text, integer) from public;
-- Sem grant: só service_role. O resgate acontece na confirmação do pagamento.

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Checkout — a intenção de compra registrada antes da ida ao gateway.
create table if not exists public.billing_checkouts (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  plan text not null check (plan in ('starter', 'plus')),
  period text not null check (period in ('monthly', 'yearly')),
  list_price_cents integer not null check (list_price_cents > 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  amount_cents integer not null check (amount_cents > 0),
  coupon_code text,
  provider text not null default 'mercadopago',
  provider_ref text,
  status text not null default 'created'
    check (status in ('created', 'authorized', 'canceled', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  authorized_at timestamptz
);

alter table public.billing_checkouts enable row level security;
-- Sem policy: criado e lido pelo servidor (service_role). A tela mostra o
-- estado pela assinatura, não por aqui.

create index if not exists billing_checkouts_provider_ref_idx
  on public.billing_checkouts (provider, provider_ref)
  where provider_ref is not null;

create index if not exists billing_checkouts_barbershop_idx
  on public.billing_checkouts (barbershop_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Preços: o mensal encarece, o anual fica. Versão 2.
insert into public.plan_prices (plan, period, price_cents, version)
select v.plan, v.period, v.price_cents, 2
from (values
  ('starter', 'monthly', 5990),
  ('starter', 'yearly', 49900),
  ('plus', 'monthly', 11990),
  ('plus', 'yearly', 99900)
) as v(plan, period, price_cents)
where not exists (
  select 1 from public.plan_prices p
  where p.plan = v.plan and p.period = v.period and p.version = 2
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Régua de lead: o rastro que faltava.
alter table public.saas_leads
  add column if not exists nurture_24h_at timestamptz,
  add column if not exists nurture_72h_at timestamptz,
  add column if not exists converted_at timestamptz,
  add column if not exists converted_barbershop_id uuid
    references public.barbershops(id) on delete set null,
  add column if not exists coupon_code text,
  add column if not exists last_delivery_error text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'saas_leads_funnel_stage_check'
  ) then
    alter table public.saas_leads
      add constraint saas_leads_funnel_stage_check
      check (funnel_stage in (
        'lead_submitted',
        'nurture_24h_sent',
        'nurture_72h_sent',
        'converted',
        'opted_out'
      ));
  end if;
end $$;

-- A consulta do cron: quem ainda não converteu, não pediu descadastro e está
-- na etapa que vence. Parcial para não indexar o funil inteiro.
create index if not exists saas_leads_nurture_idx
  on public.saas_leads (funnel_stage, created_at)
  where converted_at is null and opt_out_at is null;

create index if not exists saas_leads_contact_normalized_idx
  on public.saas_leads (contact_normalized);

-- Cupom da oferta enviada pela régua. Vale 30 dias no anual dos dois planos;
-- 20% é o desconto de recuperação, somado ao desconto que o anual já tem.
insert into public.coupons
  (code, description, kind, value, applies_to_period, first_period_only, valid_until)
select
  'VOLTA20',
  'Oferta de recuperação enviada pela régua de lead (72h sem conversão).',
  'percent',
  20,
  'yearly',
  true,
  now() + interval '365 days'
where not exists (select 1 from public.coupons where code = 'VOLTA20');

commit;
