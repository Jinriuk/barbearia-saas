-- Fase 0 — Parar o sangramento (docs/14-plano-de-fases.md).
--
-- Regra da fase: nenhum número exibido pode estar errado, e nenhuma frase de
-- venda pode prometer o que o produto não faz. Tudo aqui é correção de defeito
-- em produção, não melhoria.
--
-- Itens cobertos por esta migration:
--   0.2  cancelamento self-service da assinatura (colunas + RPCs)
--   0.4  prova de consentimento do lead (IP, user-agent, versão) e descadastro
--   0.6  saldo de estoque somado no banco, não no cliente
--   0.7  relatórios e financeiro agregados no banco (fim do teto de 1000 linhas)
--   0.8  trava de estoque negativo em qualquer movimentação
--   0.9  valor e taxa da comissão congelados na conclusão do atendimento
--   0.10 fiado de "A receber" passa a existir para o Financeiro
--   0.11 "A receber" respeita a janela (e expõe o saldo total separado)
--   0.13 gasto do cliente assinante deixa de ser R$ 0,00
--   0.14 comissão por competência, com o recebido ao lado (regime explícito)
--   0.17 colaborador criado pelo dono precisa trocar a senha no 1º acesso

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0.6 — Saldo de estoque somado no banco.
--
-- A página /produtos somava o ledger no cliente sobre as 400 movimentações
-- mais recentes: a partir da 401ª o estoque exibido virava ficção. A view
-- soma o ledger inteiro. security_invoker = true para a RLS continuar valendo
-- para quem consulta (a view não é um furo de tenant).
create or replace view public.product_stock_balances
with (security_invoker = true) as
select
  p.id as product_id,
  p.barbershop_id,
  coalesce(mv.on_hand, 0)::numeric(12, 3) as on_hand,
  coalesce(rv.reserved, 0)::numeric(12, 3) as reserved,
  (coalesce(mv.on_hand, 0) - coalesce(rv.reserved, 0))::numeric(12, 3)
    as available
from public.products p
left join lateral (
  select sum(
    case when m.type in ('purchase', 'adjustment_in', 'return')
      then m.quantity else -m.quantity end
  ) as on_hand
  from public.inventory_movements m
  where m.product_id = p.id and m.barbershop_id = p.barbershop_id
) mv on true
left join lateral (
  select sum(ap.quantity) as reserved
  from public.appointment_products ap
  where ap.product_id = p.id
    and ap.barbershop_id = p.barbershop_id
    and ap.status = 'pending'
) rv on true;

grant select on public.product_stock_balances to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0.8 — Estoque negativo deixa de ser possível.
--
-- A trava existia só dentro de confirm_product_sale (migration 0016). Qualquer
-- outra saída — "saída por perda", ajuste manual, devolução ao fornecedor —
-- entrava direto em inventory_movements pelo painel e podia deixar o saldo em
-- −100. Agora a regra vale para toda saída, venha de onde vier.
create or replace function public.enforce_inventory_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock numeric;
begin
  -- Entrada nunca deixa o saldo negativo.
  if new.type in ('purchase', 'adjustment_in', 'return') then
    return new;
  end if;

  -- Serializa movimentações do mesmo produto (mesma trava de
  -- confirm_product_sale): duas saídas simultâneas não furam o saldo.
  perform 1 from public.products where id = new.product_id for update;

  select coalesce(sum(
    case when type in ('purchase', 'adjustment_in', 'return')
      then quantity else -quantity end
  ), 0)
  into v_stock
  from public.inventory_movements
  where product_id = new.product_id
    and barbershop_id = new.barbershop_id;

  if v_stock < new.quantity then
    raise exception 'INSUFFICIENT_STOCK'
      using errcode = 'P0001',
            detail = format('saldo %s, saída %s', v_stock, new.quantity);
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_inventory_balance()
  from public, anon, authenticated;

drop trigger if exists trg_enforce_inventory_balance
  on public.inventory_movements;
create trigger trg_enforce_inventory_balance
before insert on public.inventory_movements
for each row
execute function public.enforce_inventory_balance();

-- ─────────────────────────────────────────────────────────────────────────────
-- 0.9 — Comissão congelada na conclusão.
--
-- A comissão era calculada sobre services.price LIDO AGORA: subir o preço de
-- um corte reescrevia retroativamente comissões de meses fechados. O valor
-- transacionado e a taxa aplicada passam a ser carimbados no atendimento no
-- instante da conclusão, e nunca mais mudam.
alter table public.appointments
  add column if not exists charged_price numeric(12, 2),
  add column if not exists commission_rate numeric(5, 2);

comment on column public.appointments.charged_price is
  'Preço do serviço congelado na conclusão (Fase 0 §0.9). Mudar o catálogo depois não reescreve comissão fechada.';
comment on column public.appointments.commission_rate is
  'Taxa de comissão aplicada, congelada na conclusão. Precedência: taxa do serviço quando > 0, senão a taxa padrão do profissional.';

create or replace function public.freeze_appointment_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price numeric;
  v_service_rate numeric;
  v_pro_rate numeric;
begin
  -- Carimba uma única vez: reabrir e reconcluir não reescreve o valor.
  if new.status <> 'completed' or new.charged_price is not null then
    return new;
  end if;

  select s.price, coalesce(s.commission_rate, 0)
  into v_price, v_service_rate
  from public.services s
  where s.id = new.service_id;

  select coalesce(eps.commission_rate, 0)
  into v_pro_rate
  from public.employee_pay_settings eps
  where eps.barbershop_id = new.barbershop_id
    and eps.professional_id = new.professional_id;

  new.charged_price := coalesce(v_price, 0);
  new.commission_rate := case
    when coalesce(v_service_rate, 0) > 0 then v_service_rate
    else coalesce(v_pro_rate, 0)
  end;
  return new;
end;
$$;
revoke all on function public.freeze_appointment_commission()
  from public, anon, authenticated;

drop trigger if exists trg_freeze_appointment_commission
  on public.appointments;
create trigger trg_freeze_appointment_commission
before insert or update of status on public.appointments
for each row
execute function public.freeze_appointment_commission();

-- Backfill do histórico. Preferência pelo valor que já estava congelado na
-- receita gerada na conclusão; sem receita (benefício de plano consumido, ou
-- base anterior à Fase 0), cai no preço de catálogo — a melhor aproximação
-- disponível, e a partir de agora não se move mais.
update public.appointments a
set charged_price = coalesce(
      (select ft.amount
       from public.financial_transactions ft
       where ft.appointment_id = a.id
         and ft.type = 'income'
         and ft.category = 'service'
         and ft.status <> 'canceled'
       order by ft.created_at
       limit 1),
      s.price,
      0),
    commission_rate = case
      when coalesce(s.commission_rate, 0) > 0 then s.commission_rate
      else coalesce((
        select eps.commission_rate
        from public.employee_pay_settings eps
        where eps.barbershop_id = a.barbershop_id
          and eps.professional_id = a.professional_id
      ), 0)
    end
from public.services s
where s.id = a.service_id
  and a.status = 'completed'
  and a.charged_price is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0.9 + 0.14 + 0.7 — Comissão somada no banco, com o regime explícito.
--
-- A página somava no cliente sobre .limit(3000) — que o PostgREST corta em
-- ~1000 e ninguém avisa. E mostrava só a competência, sem dizer que era
-- competência, ao lado de um lucro apurado por caixa.
--
-- Regime (decisão registrada em docs/05 e mantida aqui): a comissão é apurada
-- por COMPETÊNCIA — atendimentos concluídos no período. `received_*` mostra
-- quanto desse valor já entrou em caixa, para o dono ver a diferença antes de
-- pagar. Atendimento coberto por plano conta como recebido: o dinheiro entrou
-- na venda do plano.
create or replace function public.commission_summary(
  p_barbershop uuid,
  p_from timestamptz,
  p_to timestamptz
) returns table (
  professional_id uuid,
  produced numeric,
  commission numeric,
  received_produced numeric,
  received_commission numeric,
  completed_count integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    a.professional_id,
    coalesce(sum(a.charged_price), 0)::numeric as produced,
    coalesce(sum(a.charged_price * a.commission_rate / 100), 0)::numeric
      as commission,
    coalesce(sum(a.charged_price) filter (where cash.settled), 0)::numeric
      as received_produced,
    coalesce(
      sum(a.charged_price * a.commission_rate / 100) filter (where cash.settled),
      0
    )::numeric as received_commission,
    count(*)::integer as completed_count
  from public.appointments a
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
    and a.starts_at >= p_from
    and a.starts_at < p_to
  group by a.professional_id;
$$;
revoke all on function public.commission_summary(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.commission_summary(uuid, timestamptz, timestamptz)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0.11 — "A receber" respeita a janela.
--
-- income_summary devolvia UM número — todo o pendente, sempre — e as duas
-- telas que o consomem querem coisas diferentes: o painel mostra o saldo
-- devedor total (correto, ao lado de "Recebido hoje/semana/mês") e o
-- Financeiro mostra o mês selecionado (onde o total é errado).
--
-- `receivable` continua sendo o SALDO TOTAL, de propósito: mudar a semântica
-- dessa coluna trocaria em silêncio o número do card do painel
-- (dashboard/page.tsx:327), que hoje está certo. O recorte novo entra como
-- `receivable_period` — vendido dentro da janela e ainda não recebido — e o
-- Financeiro passa a rotular os dois.
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
  profit numeric
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
      -- Contagem real do que está pendente: a lista da tela é paginada e o
      -- título anunciava o tamanho da página como se fosse o total (§0.12).
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
      ), 0)::numeric as expenses_paid
  )
  select s.sold, s.received, s.receivable, s.receivable_period,
         s.receivable_count, s.expenses_paid,
         (s.received - s.expenses_paid) as profit
  from sums s;
$$;
revoke all on function public.income_summary(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.income_summary(uuid, timestamptz, timestamptz)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0.7 — Caixa e formas de pagamento somados no banco.
--
-- /relatorios buscava TODAS as receitas pagas da barbearia sem limite e somava
-- no cliente: o PostgREST devolve ~1000 linhas e a tela mostra o saldo de uma
-- barbearia menor do que a real, sem avisar.
create or replace function public.cash_summary(
  p_barbershop uuid,
  p_day_from timestamptz,
  p_day_to timestamptz,
  p_month_from timestamptz,
  p_month_to timestamptz
) returns table (
  total numeric,
  day_total numeric,
  month_total numeric,
  paid_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(sum(ft.amount), 0)::numeric as total,
    coalesce(sum(ft.amount) filter (
      where ft.paid_at >= p_day_from and ft.paid_at < p_day_to
    ), 0)::numeric as day_total,
    coalesce(sum(ft.amount) filter (
      where ft.paid_at >= p_month_from and ft.paid_at < p_month_to
    ), 0)::numeric as month_total,
    count(*)::bigint as paid_count
  from public.financial_transactions ft
  where ft.barbershop_id = p_barbershop
    and ft.type = 'income'
    and ft.status = 'paid';
$$;
revoke all on function public.cash_summary(uuid, timestamptz, timestamptz, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.cash_summary(uuid, timestamptz, timestamptz, timestamptz, timestamptz)
  to authenticated;

-- Recebido por forma de pagamento. `payment_method` nulo (base anterior à
-- Fase 0) sai como null e a tela rotula "Não informado" — nunca somado como
-- se fosse "Outro".
create or replace function public.income_by_payment_method(p_barbershop uuid)
returns table (
  payment_method text,
  total numeric,
  entries bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    ft.payment_method::text,
    coalesce(sum(ft.amount), 0)::numeric,
    count(*)::bigint
  from public.financial_transactions ft
  where ft.barbershop_id = p_barbershop
    and ft.type = 'income'
    and ft.status = 'paid'
  group by ft.payment_method
  order by 2 desc;
$$;
revoke all on function public.income_by_payment_method(uuid) from public, anon;
grant execute on function public.income_by_payment_method(uuid) to authenticated;

-- Vendas do período por profissional, por serviço e por produto — agregadas no
-- banco. Substitui três varreduras sem limite na página do Financeiro.
create or replace function public.revenue_breakdown(
  p_barbershop uuid,
  p_from timestamptz,
  p_to timestamptz
) returns table (
  kind text,
  ref_id uuid,
  label text,
  total numeric,
  quantity numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  -- Serviço: receita de atendimento (produto é tratado à parte, pelo ledger de
  -- reservas confirmadas, que é onde a quantidade existe).
  select 'professional'::text, pr.id, pr.name,
         coalesce(sum(ft.amount), 0)::numeric, count(*)::numeric
  from public.financial_transactions ft
  join public.appointments a on a.id = ft.appointment_id
  join public.professionals pr on pr.id = a.professional_id
  where ft.barbershop_id = p_barbershop
    and ft.type = 'income'
    and ft.status <> 'canceled'
    and ft.category <> 'product'
    and ft.created_at >= p_from and ft.created_at < p_to
  group by pr.id, pr.name

  union all

  select 'service'::text, s.id, s.name,
         coalesce(sum(ft.amount), 0)::numeric, count(*)::numeric
  from public.financial_transactions ft
  join public.appointments a on a.id = ft.appointment_id
  join public.services s on s.id = a.service_id
  where ft.barbershop_id = p_barbershop
    and ft.type = 'income'
    and ft.status <> 'canceled'
    and ft.category <> 'product'
    and ft.created_at >= p_from and ft.created_at < p_to
  group by s.id, s.name

  union all

  select 'product'::text, pd.id, pd.name,
         coalesce(sum(ap.quantity * ap.unit_price), 0)::numeric,
         coalesce(sum(ap.quantity), 0)::numeric
  from public.appointment_products ap
  join public.products pd on pd.id = ap.product_id
  where ap.barbershop_id = p_barbershop
    and ap.status = 'confirmed'
    and ap.confirmed_at >= p_from and ap.confirmed_at < p_to
  group by pd.id, pd.name

  union all

  -- Produto vendido, por profissional do atendimento — o painel mostra os dois
  -- cortes lado a lado.
  select 'product_professional'::text, pr.id, pr.name,
         coalesce(sum(ap.quantity * ap.unit_price), 0)::numeric,
         coalesce(sum(ap.quantity), 0)::numeric
  from public.appointment_products ap
  join public.appointments a on a.id = ap.appointment_id
  join public.professionals pr on pr.id = a.professional_id
  where ap.barbershop_id = p_barbershop
    and ap.status = 'confirmed'
    and ap.confirmed_at >= p_from and ap.confirmed_at < p_to
  group by pr.id, pr.name;
$$;
revoke all on function public.revenue_breakdown(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.revenue_breakdown(uuid, timestamptz, timestamptz)
  to authenticated;

-- Receita paga por dia, para o gráfico — hoje somada no cliente sobre uma
-- varredura sem limite. O dia é apurado no FUSO DA BARBEARIA: sem isso um
-- pagamento das 22h de 30/junho em São Paulo cairia em julho, porque
-- timestamptz::date resolve em UTC.
create or replace function public.income_by_day(
  p_barbershop uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_timezone text default 'UTC'
) returns table (
  paid_on date,
  category text,
  total numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select (ft.paid_at at time zone coalesce(p_timezone, 'UTC'))::date,
         ft.category,
         coalesce(sum(ft.amount), 0)::numeric
  from public.financial_transactions ft
  where ft.barbershop_id = p_barbershop
    and ft.type = 'income'
    and ft.status = 'paid'
    and ft.paid_at >= p_from and ft.paid_at < p_to
  group by 1, 2
  order by 1;
$$;
revoke all on function public.income_by_day(uuid, timestamptz, timestamptz, text)
  from public, anon;
grant execute on function public.income_by_day(uuid, timestamptz, timestamptz, text)
  to authenticated;

-- O relatório em PDF repetia o mesmo padrão do §0.7: três varreduras sem
-- limite, somadas no cliente. Não estava na lista da auditoria, mas é o
-- documento que a dona imprime e arquiva — número truncado ali vira papel.
-- A semântica de cada bloco é a mesma de antes, só que somada no banco:
-- receita de serviço é a paga no período (category <> 'product'), produto vem
-- do ledger de reservas confirmadas, e a quebra por forma de pagamento
-- continua sendo a da receita de serviço.
create or replace function public.financial_report(
  p_barbershop uuid,
  p_from timestamptz,
  p_to timestamptz
) returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with service_income as (
    select ft.amount, ft.payment_method, ft.appointment_id,
           a.client_id, a.professional_id, a.service_id
    from public.financial_transactions ft
    left join public.appointments a on a.id = ft.appointment_id
    where ft.barbershop_id = p_barbershop
      and ft.type = 'income'
      and ft.status = 'paid'
      and ft.category <> 'product'
      and ft.paid_at >= p_from and ft.paid_at < p_to
  ),
  product_sales as (
    select ap.quantity, ap.unit_price, ap.product_id,
           a.client_id, a.professional_id
    from public.appointment_products ap
    join public.appointments a on a.id = ap.appointment_id
    where ap.barbershop_id = p_barbershop
      and ap.status = 'confirmed'
      and ap.confirmed_at >= p_from and ap.confirmed_at < p_to
  ),
  everyone as (
    select client_id from service_income where client_id is not null
    union
    select client_id from product_sales where client_id is not null
  )
  select jsonb_build_object(
    'serviceRevenue', (
      select coalesce(sum(amount), 0) from service_income
      where appointment_id is not null),
    -- Receita paga sem atendimento vinculado (plano de cliente, conta a
    -- receber, lançamento avulso): entra no total, fora do "por atendimento".
    'otherRevenue', (
      select coalesce(sum(amount), 0) from service_income
      where appointment_id is null),
    'productRevenue', (
      select coalesce(sum(quantity * unit_price), 0) from product_sales),
    'productUnits', (
      select coalesce(sum(quantity), 0) from product_sales),
    'attended', (
      select count(*) from service_income where appointment_id is not null),
    'clients', (select count(*) from everyone),
    'byMethod', coalesce((
      select jsonb_agg(jsonb_build_object(
               'method', coalesce(t.payment_method::text, ''),
               'total', t.total) order by t.total desc)
      from (select si.payment_method, sum(si.amount) as total
            from service_income si group by si.payment_method) t
    ), '[]'::jsonb),
    'byProfessional', coalesce((
      select jsonb_agg(jsonb_build_object(
               'name', pr.name, 'count', t.count,
               'service', t.service, 'product', t.product,
               'total', t.service + t.product)
             order by t.service + t.product desc)
      from (
        select u.professional_id,
               sum(u.service) as service,
               sum(u.product) as product,
               sum(u.cnt) as count
        from (
          select si.professional_id, si.amount as service,
                 0::numeric as product, 1 as cnt
          from service_income si where si.professional_id is not null
          union all
          select ps.professional_id, 0::numeric,
                 ps.quantity * ps.unit_price, 0
          from product_sales ps where ps.professional_id is not null
        ) u
        group by u.professional_id
      ) t
      join public.professionals pr on pr.id = t.professional_id
    ), '[]'::jsonb),
    'byService', coalesce((
      select jsonb_agg(jsonb_build_object(
               'name', t.name, 'count', t.count, 'revenue', t.revenue)
             order by t.revenue desc)
      from (select s.name, count(*) as count, sum(si.amount) as revenue
            from service_income si
            join public.services s on s.id = si.service_id
            group by s.id, s.name) t
    ), '[]'::jsonb),
    'byProduct', coalesce((
      select jsonb_agg(jsonb_build_object(
               'name', t.name, 'qty', t.qty, 'revenue', t.revenue)
             order by t.revenue desc)
      from (select pd.name,
                   sum(ps.quantity) as qty,
                   sum(ps.quantity * ps.unit_price) as revenue
            from product_sales ps
            join public.products pd on pd.id = ps.product_id
            group by pd.id, pd.name) t
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.financial_report(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.financial_report(uuid, timestamptz, timestamptz)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0.10 — O fiado passa a existir para o Financeiro.
--
-- Um lançamento em /contas-a-receber criava linha só em accounts_receivable.
-- Nenhum indicador do Financeiro lê essa tabela: o que foi vendido no fiado
-- ficava fora de "Vendido", fora de "A receber" e fora do lucro. Agora o
-- recebível nasce com a receita pendente correspondente, no mesmo lugar em que
-- mora todo o resto do dinheiro.
create or replace function public.sync_receivable_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_id uuid;
begin
  if tg_op = 'INSERT' then
    if new.transaction_id is not null then
      return new;
    end if;
    -- Receita pendente: sem paid_at e sem forma de pagamento (a trava
    -- enforce_income_payment_method só exige método quando status = 'paid').
    insert into public.financial_transactions
      (barbershop_id, type, status, category, description, amount, due_at)
    values
      (new.barbershop_id, 'income', 'pending', 'conta_a_receber',
       new.description, new.amount, new.due_date)
    returning id into v_transaction_id;
    new.transaction_id := v_transaction_id;
    return new;
  end if;

  -- Apagar um recebível pendente apaga a receita pendente que ele criou.
  -- Precisa ser AFTER: a FK accounts_receivable.transaction_id é
  -- "on delete set null", então apagar a receita ainda dentro de um BEFORE
  -- DELETE tentaria atualizar a própria linha que está sendo apagada, e o
  -- Postgres aborta com "tuple to be deleted was already modified".
  if tg_op = 'DELETE' then
    if old.transaction_id is not null then
      delete from public.financial_transactions
      where id = old.transaction_id
        and barbershop_id = old.barbershop_id
        and status in ('pending', 'overdue');
    end if;
    return old;
  end if;

  return new;
end;
$$;
revoke all on function public.sync_receivable_transaction()
  from public, anon, authenticated;

drop trigger if exists trg_sync_receivable_transaction_ins
  on public.accounts_receivable;
create trigger trg_sync_receivable_transaction_ins
before insert on public.accounts_receivable
for each row
execute function public.sync_receivable_transaction();

drop trigger if exists trg_sync_receivable_transaction_del
  on public.accounts_receivable;
create trigger trg_sync_receivable_transaction_del
after delete on public.accounts_receivable
for each row
execute function public.sync_receivable_transaction();

-- Backfill: recebíveis pendentes que já existiam ganham a receita pendente.
-- O trigger de INSERT não roda em linha antiga, então é feito à mão.
do $$
declare
  r record;
  v_transaction_id uuid;
begin
  for r in
    select ar.id, ar.barbershop_id, ar.description, ar.amount, ar.due_date
    from public.accounts_receivable ar
    where ar.transaction_id is null
      and ar.status in ('pending', 'overdue')
  loop
    insert into public.financial_transactions
      (barbershop_id, type, status, category, description, amount, due_at)
    values
      (r.barbershop_id, 'income', 'pending', 'conta_a_receber',
       r.description, r.amount, r.due_date)
    returning id into v_transaction_id;

    update public.accounts_receivable
    set transaction_id = v_transaction_id
    where id = r.id;
  end loop;
end;
$$;

-- Baixa do recebível: liquida a receita que já existe, em vez de criar uma
-- segunda (o que dobraria o faturamento). Transacional de propósito — o
-- caminho antigo eram dois writes soltos no server action.
create or replace function public.settle_receivable(
  p_receivable_id uuid,
  p_payment_method public.payment_method
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  r record;
  v_transaction_id uuid;
begin
  if p_payment_method is null then
    raise exception 'PAYMENT_METHOD_REQUIRED' using errcode = 'P0001';
  end if;

  select ar.id, ar.barbershop_id, ar.description, ar.amount, ar.status,
         ar.transaction_id
  into r
  from public.accounts_receivable ar
  where ar.id = p_receivable_id
  for update;

  if not found then
    raise exception 'RECEIVABLE_NOT_FOUND' using errcode = 'P0001';
  end if;
  if r.status = 'paid' then
    return r.transaction_id; -- idempotente
  end if;

  if r.transaction_id is not null then
    update public.financial_transactions
    set status = 'paid', paid_at = now(), payment_method = p_payment_method
    where id = r.transaction_id
      and barbershop_id = r.barbershop_id
    returning id into v_transaction_id;
  end if;

  -- Legado sem receita vinculada: cria a receita já paga.
  if v_transaction_id is null then
    insert into public.financial_transactions
      (barbershop_id, type, status, category, description, amount, paid_at,
       payment_method, created_by)
    values
      (r.barbershop_id, 'income', 'paid', 'conta_a_receber',
       r.description, r.amount, now(), p_payment_method,
       public.current_profile_id())
    returning id into v_transaction_id;
  end if;

  update public.accounts_receivable
  set status = 'paid', transaction_id = v_transaction_id
  where id = r.id;

  return v_transaction_id;
end;
$$;
revoke all on function public.settle_receivable(uuid, public.payment_method)
  from public, anon;
grant execute on function public.settle_receivable(uuid, public.payment_method)
  to authenticated;

-- Sincronia no sentido inverso: agora que o fiado aparece na lista "A receber"
-- do Financeiro, ele também é BAIXADO por lá. Sem isto o recebível ficaria
-- 'pending' para sempre em /contas-a-receber enquanto o dinheiro já tinha
-- entrado — trocando um número errado por outro.
create or replace function public.sync_receivable_from_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type <> 'income' or new.status is not distinct from old.status then
    return new;
  end if;

  update public.accounts_receivable
  set status = new.status
  where transaction_id = new.id
    and barbershop_id = new.barbershop_id
    and status is distinct from new.status;

  return new;
end;
$$;
revoke all on function public.sync_receivable_from_transaction()
  from public, anon, authenticated;

drop trigger if exists trg_sync_receivable_from_transaction
  on public.financial_transactions;
create trigger trg_sync_receivable_from_transaction
after update of status on public.financial_transactions
for each row
execute function public.sync_receivable_from_transaction();

-- ─────────────────────────────────────────────────────────────────────────────
-- 0.13 — O gasto do cliente assinante deixa de ser R$ 0,00.
--
-- O agregado de gasto só enxergava receita ligada a atendimento
-- (ft.appointment_id). A mensalidade do plano entra por membership_payments,
-- sem appointment_id — e o atendimento coberto pelo plano nem gera receita, de
-- propósito. Resultado: o cliente mais valioso aparecia como o menos valioso,
-- justamente na tela que o produto quer vender.
create or replace function public.get_client_insights(
  p_barbershop uuid,
  p_segment text default 'todos',
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  name text,
  phone text,
  email text,
  active boolean,
  contact_opt_out boolean,
  last_completed_at timestamptz,
  days_since integer,
  completed_count bigint,
  total_spent numeric,
  avg_ticket numeric,
  top_service text,
  top_professional text,
  median_interval_days integer,
  expected_return_at timestamptz,
  confidence text,
  last_contact_at timestamptz,
  last_contact_outcome text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_phone_search text;
begin
  if not public.has_barbershop_role(
    p_barbershop,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if p_segment not in ('todos', 'para_chamar', 'proximos', 'atrasados',
                       'sem_voltar_60', 'arquivados') then
    raise exception 'INVALID_SEGMENT' using errcode = 'P0001';
  end if;

  v_phone_search := regexp_replace(coalesce(v_search, ''), '\D', '', 'g');

  return query
  with visits as (
    select a.client_id,
           a.starts_at,
           a.service_id,
           a.professional_id,
           lag(a.starts_at) over (
             partition by a.client_id order by a.starts_at
           ) as prev_starts_at
    from public.appointments a
    where a.barbershop_id = p_barbershop and a.status = 'completed'
  ),
  agg as (
    select v.client_id,
           max(v.starts_at) as last_completed_at,
           count(*) as completed_count,
           percentile_cont(0.5) within group (
             order by extract(epoch from (v.starts_at - v.prev_starts_at)) / 86400
           ) filter (where v.prev_starts_at is not null) as median_days
    from visits v
    group by v.client_id
  ),
  paid_entries as (
    -- Receita ligada a atendimento (serviço e produto).
    select a.client_id, ft.amount
    from public.financial_transactions ft
    join public.appointments a on a.id = ft.appointment_id
    where ft.barbershop_id = p_barbershop
      and ft.type = 'income'
      and ft.status = 'paid'
    union all
    -- Mensalidade do plano do cliente (Fase 0 §0.13): chega sem
    -- appointment_id e era o que zerava o gasto do assinante.
    --
    -- Passa pela financial_transactions em vez de somar mp.amount direto para
    -- manter o mesmo critério do ramo de cima (status = 'paid'): cobrança
    -- estornada por revert_income_payment ou anulada por
    -- cancel_income_transaction não pode contar como gasto. Não duplica —
    -- essas transações têm appointment_id nulo, então nunca caem no ramo de
    -- cima.
    select m.client_id, ft.amount
    from public.membership_payments mp
    join public.customer_memberships m on m.id = mp.membership_id
    join public.financial_transactions ft on ft.id = mp.transaction_id
    where mp.barbershop_id = p_barbershop
      and ft.barbershop_id = p_barbershop
      and ft.type = 'income'
      and ft.status = 'paid'
  ),
  spend as (
    select pe.client_id,
           sum(pe.amount) as total_spent,
           count(*) as paid_count
    from paid_entries pe
    group by pe.client_id
  ),
  contacts as (
    select distinct on (cc.client_id)
           cc.client_id, cc.created_at, cc.outcome
    from public.client_contacts cc
    where cc.barbershop_id = p_barbershop
    order by cc.client_id, cc.created_at desc
  ),
  enriched as (
    select
      c.id, c.name, c.phone, c.email, c.active, c.contact_opt_out,
      ag.last_completed_at,
      case when ag.last_completed_at is null then null
        else floor(extract(epoch from (now() - ag.last_completed_at)) / 86400)::integer
      end as days_since,
      coalesce(ag.completed_count, 0) as completed_count,
      coalesce(sp.total_spent, 0) as total_spent,
      case when coalesce(sp.paid_count, 0) = 0 then 0
        else round(sp.total_spent / sp.paid_count, 2)
      end as avg_ticket,
      case when ag.completed_count >= 3 and ag.median_days is not null
        then greatest(5, least(180, round(ag.median_days)))::integer
        else null
      end as median_interval_days,
      -- Hierarquia do retorno previsto (§9.2).
      case
        when ag.last_completed_at is null then null
        when ag.completed_count >= 3 and ag.median_days is not null then
          ag.last_completed_at
            + make_interval(days => greatest(5, least(180, round(ag.median_days)))::integer)
        else
          ag.last_completed_at + make_interval(days => coalesce((
            select s.return_days from public.appointments a2
            join public.services s on s.id = a2.service_id
            where a2.client_id = c.id and a2.barbershop_id = p_barbershop
              and a2.status = 'completed' and nullif(s.return_days, 0) is not null
            order by a2.starts_at desc limit 1
          ), 30))
      end as expected_return_at,
      case
        when coalesce(ag.completed_count, 0) = 0 then 'sem_historico'
        when ag.completed_count >= 3 then 'alta'
        else 'baixa'
      end as confidence,
      ct.created_at as last_contact_at,
      ct.outcome as last_contact_outcome
    from public.clients c
    left join agg ag on ag.client_id = c.id
    left join spend sp on sp.client_id = c.id
    left join contacts ct on ct.client_id = c.id
    where c.barbershop_id = p_barbershop
      and (v_search is null
        or c.name ilike '%' || v_search || '%'
        or (length(v_phone_search) >= 4
            and c.phone_normalized like '%' || v_phone_search || '%'))
  ),
  filtered as (
    select e.* from enriched e
    where case p_segment
      when 'arquivados' then not e.active
      when 'atrasados' then e.active and e.expected_return_at < now()
      when 'para_chamar' then e.active
        and e.expected_return_at < now()
        and not e.contact_opt_out
        and (e.last_contact_at is null or e.last_contact_at < now() - interval '14 days')
      when 'proximos' then e.active
        and e.expected_return_at >= now()
        and e.expected_return_at < now() + interval '7 days'
      when 'sem_voltar_60' then e.active and e.days_since >= 60
      else e.active
    end
  )
  select f.id, f.name, f.phone, f.email, f.active, f.contact_opt_out,
         f.last_completed_at, f.days_since, f.completed_count,
         f.total_spent, f.avg_ticket,
         (select s.name from public.appointments a3
            join public.services s on s.id = a3.service_id
            where a3.client_id = f.id and a3.barbershop_id = p_barbershop
              and a3.status = 'completed'
            group by s.name order by count(*) desc, s.name limit 1) as top_service,
         (select pr.name from public.appointments a4
            join public.professionals pr on pr.id = a4.professional_id
            where a4.client_id = f.id and a4.barbershop_id = p_barbershop
              and a4.status = 'completed'
            group by pr.name order by count(*) desc, pr.name limit 1) as top_professional,
         f.median_interval_days, f.expected_return_at, f.confidence,
         f.last_contact_at, f.last_contact_outcome,
         count(*) over () as total_count
  from filtered f
  order by
    case when p_segment in ('para_chamar', 'atrasados', 'proximos')
      then f.expected_return_at end asc nulls last,
    case when p_segment = 'sem_voltar_60' then f.days_since end desc nulls last,
    f.name asc
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;
revoke all on function public.get_client_insights(uuid, text, text, integer, integer)
  from public, anon;
grant execute on function public.get_client_insights(uuid, text, text, integer, integer)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0.4 — Prova de consentimento do lead e caminho de descadastro.
--
-- A landing coleta nome, contato e um "autorizo o contato" — mas não guardava
-- nada que provasse esse aceite, e não havia como sair da lista. A LGPD exige
-- os dois antes de qualquer disparo, e a Fase 5 vai disparar.
alter table public.saas_leads
  add column if not exists consent_ip inet,
  add column if not exists consent_user_agent text,
  add column if not exists consent_text_version text,
  add column if not exists consent_at timestamptz,
  add column if not exists opt_out_at timestamptz,
  add column if not exists unsubscribe_token text;

comment on column public.saas_leads.consent_text_version is
  'Versão do texto de consentimento aceito. Sem isso não há como provar O QUE a pessoa aceitou.';

update public.saas_leads
set consent_at = coalesce(consent_at, created_at)
where consent = true and consent_at is null;

update public.saas_leads
set unsubscribe_token = encode(gen_random_bytes(16), 'hex')
where unsubscribe_token is null;

alter table public.saas_leads
  alter column unsubscribe_token set default encode(gen_random_bytes(16), 'hex');
alter table public.saas_leads
  alter column unsubscribe_token set not null;

create unique index if not exists saas_leads_unsubscribe_token_key
  on public.saas_leads (unsubscribe_token);
create index if not exists saas_leads_opt_out_idx
  on public.saas_leads (opt_out_at) where opt_out_at is null;

-- Descadastro por token, sem sessão: é um link de e-mail/WhatsApp. Não devolve
-- dado nenhum do lead — só confirma que a baixa foi registrada, e é idempotente
-- para não virar oráculo de "esse token existe?".
create or replace function public.unsubscribe_saas_lead(p_token text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if p_token is null or char_length(p_token) < 16 then
    return true;
  end if;
  update public.saas_leads
  set opt_out_at = coalesce(opt_out_at, now()),
      funnel_stage = 'opted_out'
  where unsubscribe_token = p_token;
  return true;
end;
$$;
revoke all on function public.unsubscribe_saas_lead(text)
  from public, authenticated;
grant execute on function public.unsubscribe_saas_lead(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0.2 — Cancelamento self-service da assinatura.
--
-- "Cancele quando quiser" aparecia 5 vezes na comunicação e não existia
-- caminho nenhum de saída no produto. O cancelamento vale para o FIM DO
-- PERÍODO já pago — cortar o acesso na hora puniria quem pagou o mês inteiro,
-- e a página pública da barbearia cairia junto.
alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists cancellation_requested_at timestamptz,
  add column if not exists cancellation_reason text;

create or replace function public.request_subscription_cancellation(
  p_barbershop uuid,
  p_reason text default null
) returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ends_at timestamptz;
begin
  -- Só o dono cancela o próprio plano.
  if not public.has_barbershop_role(
    p_barbershop, array['owner']::public.membership_role[]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  update public.subscriptions
  set cancel_at_period_end = true,
      cancellation_requested_at = coalesce(cancellation_requested_at, now()),
      cancellation_reason = nullif(trim(coalesce(p_reason, '')), '')
  where barbershop_id = p_barbershop
    and status <> 'canceled'
  returning coalesce(current_period_end, trial_ends_at, now()) into v_ends_at;

  if v_ends_at is null then
    raise exception 'SUBSCRIPTION_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.audit_logs
    (barbershop_id, actor_profile_id, action, entity_type, entity_id, metadata)
  values
    (p_barbershop, public.current_profile_id(), 'subscription.cancel_requested',
     'subscription', p_barbershop,
     jsonb_build_object('endsAt', v_ends_at, 'reason', p_reason));

  return v_ends_at;
end;
$$;
revoke all on function public.request_subscription_cancellation(uuid, text)
  from public, anon;
grant execute on function public.request_subscription_cancellation(uuid, text)
  to authenticated;

create or replace function public.revoke_subscription_cancellation(
  p_barbershop uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_barbershop_role(
    p_barbershop, array['owner']::public.membership_role[]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  update public.subscriptions
  set cancel_at_period_end = false,
      cancellation_requested_at = null,
      cancellation_reason = null
  where barbershop_id = p_barbershop
    and status <> 'canceled';

  insert into public.audit_logs
    (barbershop_id, actor_profile_id, action, entity_type, entity_id)
  values
    (p_barbershop, public.current_profile_id(), 'subscription.cancel_revoked',
     'subscription', p_barbershop);

  return true;
end;
$$;
revoke all on function public.revoke_subscription_cancellation(uuid)
  from public, anon;
grant execute on function public.revoke_subscription_cancellation(uuid)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0.17 — Senha criada pelo dono é provisória.
--
-- O convite por e-mail (com o colaborador definindo a própria senha) é da
-- Fase 3. O mínimo aqui: a senha que o dono digitou serve só para o primeiro
-- acesso, e o colaborador é obrigado a trocá-la antes de usar o painel.
alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

comment on column public.profiles.must_change_password is
  'Senha definida por terceiro (dono criando acesso de colaborador). O painel obriga a troca no primeiro acesso — Fase 0 §0.17, mitigação até o convite por e-mail da Fase 3.';

commit;
