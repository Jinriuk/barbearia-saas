-- Fase 3 — Gestão (docs/14-plano-de-fases.md §Fase 3).
--
-- O que esta migração sustenta:
--   3.4  Comissões completas — total produzido, adiantamento/vale e o valor
--        a pagar como campo CALCULADO (não default de input editável).
--   3.5  Despesas progressivas — categoria e observação no lançamento.
--   3.6  A receber com dono — observação no recebível.
--   3.7  Lucro que desconta comissão.
--   3.8  Convite de colaborador — o dono deixa de criar a senha.
--   3.12 Mapa de calor de dias × horários.
--
-- ESTA MIGRAÇÃO ESTENDE A FASE 0 (0030), NÃO A SUBSTITUI.
--
-- A Fase 0 já resolveu, e nada aqui desfaz:
--   §0.9  o preço e a taxa da comissão são CONGELADOS na conclusão
--         (appointments.charged_price / .commission_rate). commission_summary
--         continua lendo o valor congelado — o que esta fase acrescenta são
--         colunas, não uma base de cálculo nova.
--   §0.11 `receivable` (saldo total) e `receivable_period` (recorte da
--         janela) convivem em income_summary. As duas continuam iguais.
--   §0.12 `receivable_count` — a contagem real do pendente.
--   §0.14 `received_produced` / `received_commission` — quanto da competência
--         já virou caixa. Preservados na íntegra.
--
-- Decisões desta fase (docs/05):
--
-- A) REGIME. income_summary continua em CAIXA para receita e despesa. A
--    comissão é apurada por COMPETÊNCIA, como a Fase 0 definiu. O que entra
--    é `profit_after_commissions`, ao lado de `profit` (caixa) — as duas
--    colunas convivem e a tela diz qual é qual.
--
-- B) TOTAL PRODUZIDO EM PRODUTO. Usa as MESMAS DUAS PORTAS de
--    `revenue_breakdown` (Fase 2.6): produto reservado no agendamento e
--    confirmado, mais venda de balcão com o vendedor escolhido na tela —
--    esta com o desconto rateado proporcionalmente, igual lá. Contar só uma
--    das portas faria a ficha do profissional divergir do Financeiro.
--
-- C) ADIANTAMENTO/VALE. Entra como despesa paga no financeiro na hora (o
--    dinheiro saiu do caixa) e é abatido do valor a pagar do período. Nunca
--    é somado duas vezes: o pagamento final registra só o saldo.
--
-- D) CONVITE. O convite guarda apenas o destino e o papel pretendido; a
--    senha nasce com o colaborador, no fluxo do Supabase Auth. Substitui o
--    paliativo do §0.17 (senha provisória do dono + troca obrigatória), que
--    a própria Fase 0 registrou como "o convite por e-mail é a Fase 3".

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Adiantamento / vale (item 3.4).
create table if not exists public.employee_advances (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  professional_id uuid not null,
  amount numeric(12,2) not null check (amount > 0),
  notes text check (notes is null or char_length(notes) <= 500),
  -- Competência do abatimento: a que período de fechamento este vale
  -- pertence. Default = dia em que foi dado.
  reference_date date not null default (now() at time zone 'utc')::date,
  transaction_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (professional_id, barbershop_id)
    references public.professionals(id, barbershop_id) on delete cascade,
  foreign key (transaction_id, barbershop_id)
    references public.financial_transactions(id, barbershop_id)
      on delete set null (transaction_id)
);

create index if not exists employee_advances_period_idx
  on public.employee_advances (barbershop_id, reference_date, professional_id);

alter table public.employee_advances enable row level security;

drop policy if exists "owners manage advances" on public.employee_advances;
create policy "owners manage advances"
on public.employee_advances for all to authenticated
using (
  public.has_barbershop_role(
    barbershop_id, array['owner', 'manager']::public.membership_role[]
  )
)
with check (
  public.has_barbershop_role(
    barbershop_id, array['owner', 'manager']::public.membership_role[]
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Convite de colaborador (item 3.8 — regra crítica do §7.7).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'team_invite_status') then
    create type public.team_invite_status as enum ('pending', 'accepted', 'revoked');
  end if;
end
$$;

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  email text not null check (char_length(email) between 5 and 200),
  name text not null check (char_length(name) between 2 and 100),
  role public.membership_role not null default 'professional',
  status public.team_invite_status not null default 'pending',
  -- Dados aplicados quando o convite for aceito (o profissional só existe
  -- depois que a pessoa entra).
  phone text check (phone is null or char_length(phone) <= 30),
  service_ids uuid[] not null default '{}',
  commission_rate numeric(5,2) not null default 0
    check (commission_rate between 0 and 100),
  base_salary numeric(12,2) not null default 0 check (base_salary >= 0),
  invited_by uuid references public.profiles(id) on delete set null,
  accepted_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days')
);

-- Um convite pendente por e-mail e barbearia (reenviar atualiza o existente).
create unique index if not exists team_invites_pending_key
  on public.team_invites (barbershop_id, lower(email))
  where status = 'pending';

create index if not exists team_invites_tenant_idx
  on public.team_invites (barbershop_id, status, created_at desc);

alter table public.team_invites enable row level security;

drop policy if exists "owners manage invites" on public.team_invites;
create policy "owners manage invites"
on public.team_invites for all to authenticated
using (
  public.has_barbershop_role(
    barbershop_id, array['owner', 'manager']::public.membership_role[]
  )
)
with check (
  public.has_barbershop_role(
    barbershop_id, array['owner', 'manager']::public.membership_role[]
  )
);

-- 2b. Resolver e-mail → perfil, para o caso em que a pessoa convidada JÁ tem
--     conta (o convite por e-mail do Supabase não funciona para usuário
--     existente; o acesso é liberado na hora). Restrito a quem administra a
--     equipe da barbearia informada — o mesmo público que já descobre isso
--     tentando convidar.
create or replace function public.profile_id_by_email(
  p_barbershop uuid,
  p_email text
) returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile uuid;
begin
  if not public.has_barbershop_role(
    p_barbershop, array['owner', 'manager']::public.membership_role[]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  select p.id into v_profile
  from public.profiles p
  join auth.users u on u.id = p.auth_user_id
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  return v_profile;
end;
$$;
revoke all on function public.profile_id_by_email(uuid, text) from public, anon;
grant execute on function public.profile_id_by_email(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Despesa progressiva (item 3.5) e recebível com observação (item 3.6).
--    A primeira linha do formulário continua sendo descrição, valor e
--    vencimento; estas colunas alimentam o "Adicionar detalhes".
--    `accounts_receivable.client_id` já existia desde 202607020001 — faltava
--    a tela preencher.
alter table public.accounts_payable
  add column if not exists category text
    check (category is null or char_length(category) <= 40),
  add column if not exists notes text
    check (notes is null or char_length(notes) <= 500);

alter table public.accounts_receivable
  add column if not exists notes text
    check (notes is null or char_length(notes) <= 500);

create index if not exists accounts_receivable_client_idx
  on public.accounts_receivable (barbershop_id, client_id)
  where client_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Fechamento por profissional (item 3.4).
--
--    Mantém INTEGRALMENTE o núcleo da Fase 0 §0.9/§0.14: base congelada,
--    exclusão de venda anulada, atendimento coberto por plano contando como
--    recebido, e as colunas `produced`, `commission`, `received_produced`,
--    `received_commission`, `completed_count`.
--
--    Acrescenta o que o §7.5 pede para fechar o mês da equipe: nome, produção
--    em PRODUTO (as duas portas da Fase 2.6), vale, já pago, regra de
--    pagamento e o valor a pagar calculado.
drop function if exists public.commission_summary(uuid, timestamptz, timestamptz);
drop function if exists public.commission_summary(uuid, timestamptz, timestamptz, text);
create function public.commission_summary(
  p_barbershop uuid,
  p_from timestamptz,
  p_to timestamptz,
  -- O vale é datado em DIA (reference_date), não em instante. Converter a
  -- janela no fuso do tenant evita que um vale do último dia do período caia
  -- fora — ou que o do dia anterior entre — em fusos de offset positivo.
  p_timezone text default 'America/Sao_Paulo'
) returns table (
  professional_id uuid,
  professional_name text,
  produced numeric,
  produced_products numeric,
  produced_total numeric,
  commission numeric,
  received_produced numeric,
  received_commission numeric,
  completed_count integer,
  base_salary numeric,
  model text,
  advances numeric,
  paid numeric,
  to_pay numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with services_done as (
    select
      a.professional_id,
      coalesce(sum(a.charged_price), 0)::numeric as produced,
      coalesce(sum(a.charged_price * rate.pct / 100), 0)::numeric as commission,
      coalesce(sum(a.charged_price) filter (where cash.settled), 0)::numeric
        as received_produced,
      coalesce(
        sum(a.charged_price * rate.pct / 100) filter (where cash.settled),
        0
      )::numeric as received_commission,
      count(*)::integer as completed_count
    from public.appointments a
    -- Taxa congelada na conclusão. Só cai na taxa vigente do profissional
    -- quando NENHUMA taxa estava configurada naquele momento (congelado =
    -- null) — assim configurar a comissão depois não deixa o mês valendo
    -- zero, e mexer numa taxa já aplicada continua sem reescrever mês
    -- fechado. (Fase 0 §0.9 — preservado na íntegra.)
    left join lateral (
      select coalesce(a.commission_rate, (
        select eps.commission_rate
        from public.employee_pay_settings eps
        where eps.barbershop_id = a.barbershop_id
          and eps.professional_id = a.professional_id
      ), 0) as pct
    ) rate on true
    left join lateral (
      select (
        exists (
          select 1 from public.financial_transactions ft
          where ft.appointment_id = a.id
            and ft.type = 'income'
            and ft.category = 'service'
            and ft.status = 'paid'
        )
        or exists (
          select 1 from public.membership_usage mu
          where mu.appointment_id = a.id
        )
      ) as settled
    ) cash on true
    where a.barbershop_id = p_barbershop
      and a.status = 'completed'
      and a.professional_id is not null
      and a.starts_at >= p_from
      and a.starts_at < p_to
      -- Venda anulada não gera comissão. Atendimento SEM receita nenhuma
      -- continua contando: é o caso do serviço coberto por plano, que não
      -- gera receita de propósito. (Fase 0 — preservado.)
      and (
        not exists (
          select 1 from public.financial_transactions ft
          where ft.appointment_id = a.id
            and ft.type = 'income'
            and ft.category = 'service'
        )
        or exists (
          select 1 from public.financial_transactions ft
          where ft.appointment_id = a.id
            and ft.type = 'income'
            and ft.category = 'service'
            and ft.status <> 'canceled'
        )
      )
    group by a.professional_id
  ),
  -- As MESMAS duas portas de revenue_breakdown (Fase 2.6). Produto não gera
  -- comissão pela regra vigente — entra só como produção.
  products_done as (
    select professional_id, coalesce(sum(total), 0)::numeric as produced
    from (
      select a.professional_id,
             (ap.quantity * ap.unit_price)::numeric as total
      from public.appointment_products ap
      join public.appointments a on a.id = ap.appointment_id
      where ap.barbershop_id = p_barbershop
        and ap.status = 'confirmed'
        and a.professional_id is not null
        and ap.confirmed_at >= p_from and ap.confirmed_at < p_to

      union all

      -- Arredondado ao centavo: o rateio do desconto é uma divisão, e sem o
      -- round a produção fica com cauda binária (60,0000000000000000001).
      -- `revenue_breakdown` mostra o mesmo valor formatado em duas casas, então
      -- as duas telas continuam batendo — aqui o número já sai como dinheiro.
      select cs.professional_id,
             round(
               ci.quantity * ci.unit_price
                 * case when cs.subtotal > 0 then cs.total / cs.subtotal else 1 end,
               2
             )::numeric
      from public.counter_sale_items ci
      join public.counter_sales cs on cs.id = ci.sale_id
      where ci.barbershop_id = p_barbershop
        and cs.professional_id is not null
        and ci.created_at >= p_from and ci.created_at < p_to
    ) lines
    group by professional_id
  ),
  settings as (
    select s.professional_id, s.model, s.base_salary
    from public.employee_pay_settings s
    where s.barbershop_id = p_barbershop
  ),
  advances_given as (
    select adv.professional_id,
           coalesce(sum(adv.amount), 0)::numeric as total
    from public.employee_advances adv
    where adv.barbershop_id = p_barbershop
      and adv.reference_date >= (p_from at time zone p_timezone)::date
      and adv.reference_date < (p_to at time zone p_timezone)::date
    group by adv.professional_id
  ),
  payments_made as (
    select pay.professional_id,
           coalesce(sum(pay.amount), 0)::numeric as total
    from public.employee_payments pay
    where pay.barbershop_id = p_barbershop
      and pay.paid_at >= p_from and pay.paid_at < p_to
    group by pay.professional_id
  )
  select
    p.id,
    p.name,
    coalesce(sd.produced, 0)::numeric,
    coalesce(pd.produced, 0)::numeric,
    (coalesce(sd.produced, 0) + coalesce(pd.produced, 0))::numeric,
    coalesce(sd.commission, 0)::numeric,
    coalesce(sd.received_produced, 0)::numeric,
    coalesce(sd.received_commission, 0)::numeric,
    coalesce(sd.completed_count, 0)::integer,
    coalesce(st.base_salary, 0)::numeric,
    coalesce(st.model, 'commission')::text,
    coalesce(ag.total, 0)::numeric,
    coalesce(pm.total, 0)::numeric,
    -- Valor a pagar = o que o modelo manda − vale − o que já foi pago.
    -- Nunca negativo: vale maior que a produção fica em zero e a tela mostra
    -- o vale separadamente.
    greatest(
      0,
      (case coalesce(st.model, 'commission')
         when 'fixed'  then coalesce(st.base_salary, 0)
         when 'hybrid' then coalesce(st.base_salary, 0) + coalesce(sd.commission, 0)
         else coalesce(sd.commission, 0)
       end)
      - coalesce(ag.total, 0)
      - coalesce(pm.total, 0)
    )::numeric
  from public.professionals p
  left join services_done sd on sd.professional_id = p.id
  left join products_done pd on pd.professional_id = p.id
  left join settings st on st.professional_id = p.id
  left join advances_given ag on ag.professional_id = p.id
  left join payments_made pm on pm.professional_id = p.id
  where p.barbershop_id = p_barbershop and p.active
  order by (coalesce(sd.produced, 0) + coalesce(pd.produced, 0)) desc, p.name;
$$;
revoke all on function public.commission_summary(uuid, timestamptz, timestamptz, text)
  from public, anon;
grant execute on function public.commission_summary(uuid, timestamptz, timestamptz, text)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Lucro que desconta comissão (item 3.7).
--
--    Mantém as SETE colunas da Fase 0 com o mesmo significado (inclusive
--    `receivable` como saldo total, `receivable_period` e `receivable_count`
--    dos §0.11/§0.12) e acrescenta duas no fim.
drop function if exists public.income_summary(uuid, timestamptz, timestamptz);
create function public.income_summary(
  p_barbershop uuid,
  p_from timestamptz,
  p_to timestamptz
) returns table (
  sold numeric,
  received numeric,
  receivable numeric,
  receivable_period numeric,
  receivable_count bigint,
  expenses_paid numeric,
  profit numeric,
  commissions_accrued numeric,
  profit_after_commissions numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with sums as (
    select
      coalesce((
        select sum(amount) from public.financial_transactions
        where barbershop_id = p_barbershop and type = 'income'
          and status <> 'canceled'
          and created_at >= p_from and created_at < p_to
      ), 0)::numeric as sold,
      coalesce((
        select sum(amount) from public.financial_transactions
        where barbershop_id = p_barbershop and type = 'income'
          and status = 'paid'
          and paid_at >= p_from and paid_at < p_to
      ), 0)::numeric as received,
      coalesce((
        select sum(amount) from public.financial_transactions
        where barbershop_id = p_barbershop and type = 'income'
          and status in ('pending', 'overdue')
      ), 0)::numeric as receivable,
      coalesce((
        select sum(amount) from public.financial_transactions
        where barbershop_id = p_barbershop and type = 'income'
          and status in ('pending', 'overdue')
          and created_at >= p_from and created_at < p_to
      ), 0)::numeric as receivable_period,
      (
        select count(*) from public.financial_transactions
        where barbershop_id = p_barbershop and type = 'income'
          and status in ('pending', 'overdue')
      )::bigint as receivable_count,
      coalesce((
        select sum(amount) from public.financial_transactions
        where barbershop_id = p_barbershop and type = 'expense'
          and status = 'paid'
          and paid_at >= p_from and paid_at < p_to
      ), 0)::numeric as expenses_paid,
      -- Comissão APURADA no período (competência), venha ela a ser paga
      -- neste mês ou no seguinte. É o que o dono ainda deve à equipe.
      coalesce((
        select sum(cs.commission)
        from public.commission_summary(p_barbershop, p_from, p_to) cs
      ), 0)::numeric as commissions_accrued,
      -- Comissão já paga dentro da janela — entra em expenses_paid como
      -- despesa 'salary' e por isso precisa ser devolvida antes de descontar
      -- a apurada, senão a equipe é descontada duas vezes.
      coalesce((
        select sum(amount) from public.financial_transactions
        where barbershop_id = p_barbershop and type = 'expense'
          and status = 'paid' and category = 'salary'
          and paid_at >= p_from and paid_at < p_to
      ), 0)::numeric as salary_paid
  )
  select
    s.sold,
    s.received,
    s.receivable,
    s.receivable_period,
    s.receivable_count,
    s.expenses_paid,
    (s.received - s.expenses_paid) as profit,
    s.commissions_accrued,
    (s.received - s.expenses_paid + s.salary_paid - s.commissions_accrued)
      as profit_after_commissions
  from sums s;
$$;
revoke all on function public.income_summary(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.income_summary(uuid, timestamptz, timestamptz)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Série do gráfico do §7.5 (item 3.3).
--
--    Coexiste com `income_by_day` da Fase 0, que responde outra pergunta:
--    lá é RECEITA quebrada por categoria, por dia; aqui é recebido CONTRA
--    despesa, no mesmo balde, com bucket por dia ou por mês — que é o que a
--    barra verde/coral com a linha tracejada do período anterior precisa.
create or replace function public.cash_flow_series(
  p_barbershop uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_timezone text default 'America/Sao_Paulo',
  p_bucket text default 'day'
) returns table (
  bucket_start date,
  received numeric,
  expenses numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (date_trunc(
      case when p_bucket = 'month' then 'month' else 'day' end,
      t.paid_at at time zone p_timezone
    ))::date as bucket_start,
    coalesce(sum(t.amount) filter (where t.type = 'income'), 0)::numeric,
    coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)::numeric
  from public.financial_transactions t
  where t.barbershop_id = p_barbershop
    and t.status = 'paid'
    and t.paid_at >= p_from and t.paid_at < p_to
  group by 1;
$$;
revoke all on function public.cash_flow_series(uuid, timestamptz, timestamptz, text, text)
  from public, anon;
grant execute on function public.cash_flow_series(uuid, timestamptz, timestamptz, text, text)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Mapa de calor de dias × horários (item 3.12 / §6.2).
--    Agrega no banco e no fuso do tenant. Devolve só as células com
--    movimento; a tela desenha a grade completa. Usa o preço congelado
--    quando existe — o mesmo valor que a comissão enxerga.
create or replace function public.appointment_heatmap(
  p_barbershop uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_timezone text default 'America/Sao_Paulo'
) returns table (
  weekday integer,
  hour integer,
  appointments bigint,
  revenue numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    extract(dow from (a.starts_at at time zone p_timezone))::integer as weekday,
    extract(hour from (a.starts_at at time zone p_timezone))::integer as hour,
    count(*)::bigint as appointments,
    coalesce(sum(coalesce(a.charged_price, sv.price)), 0)::numeric as revenue
  from public.appointments a
  left join public.services sv on sv.id = a.service_id
  where a.barbershop_id = p_barbershop
    and a.status in ('completed', 'confirmed')
    and a.starts_at >= p_from and a.starts_at < p_to
  group by 1, 2;
$$;
revoke all on function public.appointment_heatmap(uuid, timestamptz, timestamptz, text)
  from public, anon;
grant execute on function public.appointment_heatmap(uuid, timestamptz, timestamptz, text)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Índices que estas telas passam a exigir.
create index if not exists employee_payments_period_idx
  on public.employee_payments (barbershop_id, paid_at desc, professional_id);

commit;
