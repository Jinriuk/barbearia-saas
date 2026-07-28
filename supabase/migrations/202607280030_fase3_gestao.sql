-- Fase 3 — Gestão (docs/14-plano-de-fases.md §Fase 3).
--
-- O que esta migração sustenta:
--   3.4  Comissões completas — total produzido, adiantamento/vale e o valor
--        a pagar como campo CALCULADO (não default de input editável).
--   3.5  Despesas progressivas — categoria e observação no lançamento.
--   3.6  A receber com dono — observação no recebível (o client_id já existe
--        no schema desde 202607020001; faltava a tela preencher).
--   3.7  Lucro que desconta comissão — income_summary passa a devolver a
--        comissão apurada e o lucro depois dela.
--   3.8  Convite de colaborador — o dono deixa de criar a senha.
--   3.12 Mapa de calor de dias × horários.
--
-- Decisões registradas (docs/05):
--
-- A) REGIME. income_summary continua em CAIXA para receita e despesa
--    (recebido − despesas pagas). A comissão é apurada por COMPETÊNCIA
--    (atendimento concluído no período), porque é assim que a barbearia
--    fecha o mês da equipe. Os dois números convivem em colunas separadas:
--    `profit` (caixa, como antes) e `profit_after_commissions`
--    (caixa − comissão apurada). A tela diz qual é qual — a auditoria
--    reclamava justamente da mistura silenciosa (item 0.14).
--
-- B) BASE DA COMISSÃO. Mantida a regra vigente e documentada da Fase 4:
--    taxa do SERVIÇO quando > 0, senão a taxa padrão do PROFISSIONAL, sobre
--    o preço do serviço. Congelar o valor transacionado é o item 0.9 da
--    Fase 0 e NÃO é feito aqui — trocar a base junto com a reorganização da
--    tela tornaria impossível saber qual mudança moveu o número. O que muda
--    aqui é onde a conta roda: sai do cliente (que truncava em 3.000 linhas)
--    e passa para o banco.
--
-- C) TOTAL PRODUZIDO. Usa a MESMA base da comissão para os serviços, mais a
--    receita de produtos confirmados atribuída ao profissional. Sem isso o
--    profissional não consegue conferir a própria comissão — que é o pedido
--    literal do item 3.4.
--
-- D) ADIANTAMENTO/VALE. Entra como despesa paga no financeiro na hora (o
--    dinheiro saiu do caixa) e é abatido do valor a pagar do período. Nunca
--    é somado duas vezes: o pagamento final registra só o saldo.
--
-- E) CONVITE. O convite guarda apenas o destino e o papel pretendido; a
--    senha nasce com o colaborador, no fluxo do Supabase Auth. O token não
--    é guardado aqui — quem emite o link é o próprio Auth.

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

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Despesa progressiva (item 3.5) e recebível com dono (item 3.6).
--    A primeira linha do formulário continua sendo descrição, valor e
--    vencimento; estas colunas alimentam o "Adicionar detalhes".
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
-- 4. Fechamento por profissional no banco (item 3.4).
--    Antes: a página somava 3.000 atendimentos no cliente — acima disso a
--    comissão exibida era ficção silenciosa (mesma família do item 0.7).
create or replace function public.commission_summary(
  p_barbershop uuid,
  p_from timestamptz,
  p_to timestamptz
) returns table (
  professional_id uuid,
  professional_name text,
  completed_count bigint,
  produced_services numeric,
  produced_products numeric,
  produced_total numeric,
  commission numeric,
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
  with pros as (
    select p.id, p.name
    from public.professionals p
    where p.barbershop_id = p_barbershop and p.active
  ),
  settings as (
    select s.professional_id, s.model, s.base_salary, s.commission_rate
    from public.employee_pay_settings s
    where s.barbershop_id = p_barbershop
  ),
  -- Serviços concluídos no período. Precedência da taxa: serviço > padrão
  -- do profissional (regra única — docs/05).
  services_done as (
    select
      a.professional_id,
      count(*) as completed_count,
      coalesce(sum(sv.price), 0)::numeric as produced,
      coalesce(sum(
        sv.price * (
          case
            when coalesce(sv.commission_rate, 0) > 0 then sv.commission_rate
            else coalesce(st.commission_rate, 0)
          end
        ) / 100.0
      ), 0)::numeric as commission
    from public.appointments a
    join public.services sv on sv.id = a.service_id
    left join settings st on st.professional_id = a.professional_id
    where a.barbershop_id = p_barbershop
      and a.status = 'completed'
      and a.professional_id is not null
      and a.starts_at >= p_from and a.starts_at < p_to
    group by a.professional_id
  ),
  products_done as (
    select
      a.professional_id,
      coalesce(sum(ap.quantity * ap.unit_price), 0)::numeric as produced
    from public.appointment_products ap
    join public.appointments a on a.id = ap.appointment_id
    where ap.barbershop_id = p_barbershop
      and ap.status = 'confirmed'
      and a.professional_id is not null
      and ap.confirmed_at >= p_from and ap.confirmed_at < p_to
    group by a.professional_id
  ),
  advances_given as (
    select adv.professional_id,
           coalesce(sum(adv.amount), 0)::numeric as total
    from public.employee_advances adv
    where adv.barbershop_id = p_barbershop
      and adv.reference_date >= (p_from at time zone 'utc')::date
      and adv.reference_date < (p_to at time zone 'utc')::date
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
    pros.id,
    pros.name,
    coalesce(sd.completed_count, 0)::bigint,
    coalesce(sd.produced, 0)::numeric,
    coalesce(pd.produced, 0)::numeric,
    (coalesce(sd.produced, 0) + coalesce(pd.produced, 0))::numeric,
    coalesce(sd.commission, 0)::numeric,
    coalesce(st.base_salary, 0)::numeric,
    coalesce(st.model, 'commission')::text,
    coalesce(ag.total, 0)::numeric,
    coalesce(pm.total, 0)::numeric,
    -- Valor a pagar = o que o modelo manda − vale − o que já foi pago.
    -- Nunca negativo: vale maior que a produção fica em zero e a tela
    -- mostra o saldo devedor separadamente.
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
  from pros
  left join services_done sd on sd.professional_id = pros.id
  left join products_done pd on pd.professional_id = pros.id
  left join settings st on st.professional_id = pros.id
  left join advances_given ag on ag.professional_id = pros.id
  left join payments_made pm on pm.professional_id = pros.id
  order by (coalesce(sd.produced, 0) + coalesce(pd.produced, 0)) desc, pros.name;
$$;
revoke all on function public.commission_summary(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.commission_summary(uuid, timestamptz, timestamptz)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Lucro que desconta comissão (item 3.7).
--    Mudar colunas de retorno exige drop + create. As colunas antigas
--    continuam com o mesmo nome e o mesmo significado — só entram duas
--    novas no fim, então quem lê por nome não quebra.
drop function if exists public.income_summary(uuid, timestamptz, timestamptz);
create function public.income_summary(
  p_barbershop uuid,
  p_from timestamptz,
  p_to timestamptz
) returns table (
  sold numeric,
  received numeric,
  receivable numeric,
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
        where barbershop_id = p_barbershop and type = 'expense'
          and status = 'paid'
          and paid_at >= p_from and paid_at < p_to
      ), 0)::numeric as expenses_paid,
      -- Comissão APURADA no período (competência), venha ela a ser paga
      -- neste mês ou no seguinte. É o que o dono ainda deve à equipe.
      coalesce((
        select sum(cs.commission) from public.commission_summary(
          p_barbershop, p_from, p_to
        ) cs
      ), 0)::numeric as commissions_accrued,
      -- Comissão já paga dentro da janela — entra em expenses_paid como
      -- despesa 'salary' e por isso precisa ser devolvida antes de
      -- descontar a apurada, senão a equipe é descontada duas vezes.
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
-- 5b. Série do gráfico do §7.5 (item 3.3), agregada no banco.
--     O gráfico antigo somava as transações no cliente e por isso herdava o
--     teto de linhas do PostgREST (família do item 0.7): a partir de certo
--     volume a barra desenhada era menor que a realidade, em silêncio. Aqui
--     a soma é do Postgres, e a janela pode ser qualquer uma.
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
-- 6. Mapa de calor de dias × horários (item 3.12 / §6.2).
--    Agrega no banco e no fuso do tenant. Devolve só as células com
--    movimento; a tela desenha a grade completa.
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
    coalesce(sum(sv.price), 0)::numeric as revenue
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
-- 7. Índices que estas telas passam a exigir.
--    commission_summary varre atendimentos concluídos por período; o mapa de
--    calor varre uma janela longa (90 dias) da mesma tabela.
create index if not exists appointments_status_period_idx
  on public.appointments (barbershop_id, status, starts_at);

create index if not exists employee_payments_period_idx
  on public.employee_payments (barbershop_id, paid_at desc, professional_id);

commit;
