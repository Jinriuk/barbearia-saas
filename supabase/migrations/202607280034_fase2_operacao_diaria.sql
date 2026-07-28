-- Fase 2 — O que o barbeiro usa todo dia.
--
-- Escopo desta migration (docs/14-plano-de-fases.md, itens 2.1 a 2.7):
--   1. Máquina de estados com "Em atendimento" e falta sem confirmar antes.
--   2. Consequências do estado novo no que já existia: exclusion constraint
--      da agenda, disponibilidade pública e saldo de produto da vitrine.
--   3. Estoque: a view product_stock_balances (Fase 0.6) ganha a data da
--      última movimentação, que a lista de produtos passa a exibir.
--   4. Venda de balcão (avulsa, sem agendamento) transacional, e o relatório
--      de produtos do Financeiro passando a enxergar as duas portas de venda.
--   5. "Finalizar e receber" num gesto só.
--   6. Inteligência de clientes: segmentos Assinantes/Inadimplentes, situação
--      do plano por cliente, observações e consulta por id.
--   7. Perfil do cliente: histórico e pagamentos por cliente.
--
-- Constrói em cima da Fase 0: o saldo de estoque (view), a trava de estoque
-- negativo (trigger) e o gasto do assinante já vieram de lá — aqui só entra
-- o que a Fase 2 acrescenta.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Máquina de estados com "Em atendimento".
--
-- pending    → confirmed | canceled | no_show
-- confirmed  → in_progress | completed | canceled | no_show
-- in_progress→ completed | canceled | confirmed (desfazer o "Iniciar")
-- completed  → confirmed  (correção de engano)
-- no_show    → confirmed  (correção de engano)
--
-- `pending → no_show` é novo: um horário que passou e nunca foi confirmado
-- era uma falta que o balcão não conseguia registrar sem antes confirmar um
-- atendimento que não aconteceu.
create or replace function public.enforce_appointment_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if not (
    (old.status = 'pending' and new.status in ('confirmed', 'canceled', 'no_show'))
    or (old.status = 'confirmed' and new.status in ('in_progress', 'completed', 'canceled', 'no_show'))
    or (old.status = 'in_progress' and new.status in ('completed', 'canceled', 'confirmed'))
    -- correções explícitas de engano do balcão:
    or (old.status = 'completed' and new.status = 'confirmed')
    or (old.status = 'no_show' and new.status = 'confirmed')
  ) then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  -- Concluído não pode acontecer no futuro (verdade operacional).
  if new.status = 'completed' and new.starts_at > now() then
    raise exception 'COMPLETION_IN_FUTURE' using errcode = 'P0001';
  end if;
  -- Iniciar também não: "Em atendimento" descreve agora, não amanhã.
  if new.status = 'in_progress' and new.starts_at > now() then
    raise exception 'START_IN_FUTURE' using errcode = 'P0001';
  end if;

  return new;
end;
$$;
revoke all on function public.enforce_appointment_transition()
  from public, anon, authenticated;

-- Um atendimento em curso continua ocupando o horário do profissional. A
-- exclusion constraint original nasceu sem nome dentro do create table
-- (202607020001), então o nome gerado varia — derrubamos pelo catálogo.
do $$
declare
  v_name text;
begin
  for v_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'appointments'
      and con.contype = 'x'
  loop
    execute format('alter table public.appointments drop constraint %I', v_name);
  end loop;
end;
$$;

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    barbershop_id with =,
    professional_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed', 'in_progress', 'completed'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Disponibilidade pública: o horário em atendimento também está ocupado.
create or replace function public.get_public_availability(
  p_slug text,
  p_professional_id uuid,
  p_service_id uuid,
  p_date date
)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  tenant_id uuid;
  tenant_timezone text;
  duration_minutes integer;
  notice_minutes integer;
  horizon_days integer;
  requested_weekday integer;
begin
  select b.id, b.timezone, coalesce(ps.custom_duration_minutes, s.duration_minutes),
         ts.booking_notice_minutes, ts.booking_horizon_days
  into tenant_id, tenant_timezone, duration_minutes, notice_minutes, horizon_days
  from public.barbershops b
  join public.tenant_settings ts on ts.barbershop_id = b.id
  join public.services s on s.barbershop_id = b.id and s.id = p_service_id
    and s.active and s.public_visible and s.audience = 'public'
  join public.professional_services ps on ps.service_id = s.id and ps.professional_id = p_professional_id
  join public.professionals pr on pr.id = ps.professional_id and pr.barbershop_id = b.id and pr.active and pr.public_visible
  where b.slug = lower(trim(p_slug)) and b.status in ('trial', 'active');

  if tenant_id is null
     or p_date < (now() at time zone tenant_timezone)::date
     or p_date > (now() at time zone tenant_timezone)::date + coalesce(horizon_days, 60) then
    return;
  end if;

  requested_weekday := extract(dow from p_date);

  return query
  with rules as (
    select
      (p_date + av.starts_at) at time zone tenant_timezone as rule_start,
      (p_date + av.ends_at) at time zone tenant_timezone as rule_end,
      av.slot_interval_minutes
    from public.professional_availability av
    where av.barbershop_id = tenant_id
      and av.professional_id = p_professional_id
      and av.weekday = requested_weekday
      and av.active
  ),
  slots as (
    select
      generated as slot_start,
      generated + make_interval(mins => duration_minutes) as slot_end
    from rules r
    cross join lateral generate_series(
      r.rule_start,
      r.rule_end - make_interval(mins => duration_minutes),
      make_interval(mins => r.slot_interval_minutes)
    ) generated
  )
  select sl.slot_start, sl.slot_end
  from slots sl
  where sl.slot_start >= now() + make_interval(mins => notice_minutes)
    and not exists (
      select 1 from public.appointments a
      where a.barbershop_id = tenant_id
        and a.professional_id = p_professional_id
        and a.status in ('pending', 'confirmed', 'in_progress', 'completed')
        and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(sl.slot_start, sl.slot_end, '[)')
    )
    and not exists (
      select 1 from public.schedule_blocks sb
      where sb.barbershop_id = tenant_id
        and sb.professional_id = p_professional_id
        and tstzrange(sb.starts_at, sb.ends_at, '[)') && tstzrange(sl.slot_start, sl.slot_end, '[)')
    )
  order by sl.slot_start;
end;
$$;
revoke all on function public.get_public_availability(text, uuid, uuid, date) from public;
grant execute on function public.get_public_availability(text, uuid, uuid, date)
  to anon, authenticated;

-- Visão Mês da agenda (§7.2.2): contagem por dia agregada no banco. Um mês
-- cheio de uma equipe de 8 estoura o teto de linhas do PostgREST, então a
-- tela nunca busca os atendimentos do mês inteiro.
create or replace function public.get_agenda_month(
  p_barbershop uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_professional uuid default null
)
returns table (
  day date,
  scheduled bigint,
  completed bigint,
  canceled bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (a.starts_at at time zone b.timezone)::date as day,
    count(*) filter (where a.status <> 'canceled') as scheduled,
    count(*) filter (where a.status = 'completed') as completed,
    count(*) filter (where a.status = 'canceled') as canceled
  from public.appointments a
  join public.barbershops b on b.id = a.barbershop_id
  where a.barbershop_id = p_barbershop
    and a.starts_at >= p_from
    and a.starts_at < p_to
    and (p_professional is null or a.professional_id = p_professional)
  group by 1
  order by 1;
$$;
revoke all on function public.get_agenda_month(uuid, timestamptz, timestamptz, uuid)
  from public, anon;
grant execute on function public.get_agenda_month(uuid, timestamptz, timestamptz, uuid)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2b. Compatibilidade com a Fase 4 (vitrine pública).
--
-- product_available_stock conta como reservado o produto de agendamentos
-- 'pending'/'confirmed'. Com o estado novo, um atendimento EM ANDAMENTO sairia
-- desse filtro e o produto já reservado voltaria a parecer disponível na
-- vitrine. O patch é condicional porque a função nasce na Fase 4, que na data
-- desta migration está aplicada no banco mas ainda não no repositório.
--
-- ATENÇÃO para quem trouxer a Fase 4 ao repositório: a lista de situações
-- desta função precisa continuar incluindo 'in_progress'.
do $patch$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'product_available_stock'
  ) then
    execute $fn$
      create or replace function public.product_available_stock(
        p_barbershop_id uuid,
        p_product_id uuid
      )
      returns numeric
      language sql
      stable
      security definer
      set search_path = ''
      as $body$
        select case
          -- Sem nenhuma movimentação o produto não é controlado por estoque.
          when not exists (
            select 1
            from public.inventory_movements im
            where im.barbershop_id = p_barbershop_id
              and im.product_id = p_product_id
          ) then null
          else
            coalesce((
              select sum(
                case when im.type in ('purchase', 'adjustment_in', 'return')
                  then im.quantity else -im.quantity end
              )
              from public.inventory_movements im
              where im.barbershop_id = p_barbershop_id
                and im.product_id = p_product_id
            ), 0)
            - coalesce((
              select sum(ap.quantity)
              from public.appointment_products ap
              join public.appointments a on a.id = ap.appointment_id
              where ap.barbershop_id = p_barbershop_id
                and ap.product_id = p_product_id
                and ap.status = 'pending'
                and a.status in ('pending', 'confirmed', 'in_progress')
            ), 0)
        end
      $body$;
    $fn$;
    execute 'revoke all on function public.product_available_stock(uuid, uuid) from public, anon, authenticated';
  end if;
end;
$patch$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Estoque: a Fase 0 já resolveu o saldo (view product_stock_balances) e a
--    trava de negativo (trigger trg_enforce_inventory_balance). Aqui a view
--    só ganha a data da última movimentação, que a lista de produtos passa a
--    exibir por linha (§7.6). `create or replace view` aceita acrescentar
--    coluna no fim — a ordem das existentes não muda.
create or replace view public.product_stock_balances
with (security_invoker = true) as
select
  p.id as product_id,
  p.barbershop_id,
  coalesce(mv.on_hand, 0)::numeric(12, 3) as on_hand,
  coalesce(rv.reserved, 0)::numeric(12, 3) as reserved,
  (coalesce(mv.on_hand, 0) - coalesce(rv.reserved, 0))::numeric(12, 3)
    as available,
  mv.last_movement_at
from public.products p
left join lateral (
  select sum(
    case when m.type in ('purchase', 'adjustment_in', 'return')
      then m.quantity else -m.quantity end
  ) as on_hand,
  max(m.created_at) as last_movement_at
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
-- 4. Venda de balcão (item 2.6): venda avulsa, sem agendamento.
--
-- appointment_products exige appointment_id — uma venda de balcão não tem
-- onde morar nessa tabela. Duas tabelas novas resolvem sem distorcer o
-- modelo do upsell do agendamento, e o revenue_breakdown da Fase 0 passa a
-- ler as duas fontes (reescrito abaixo).
create table if not exists public.counter_sales (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  client_id uuid,
  professional_id uuid,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null check (total >= 0),
  payment_method public.payment_method,
  transaction_id uuid,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint counter_sales_total_consistent check (total = subtotal - discount),
  constraint counter_sales_id_barbershop_key unique (id, barbershop_id),
  foreign key (client_id, barbershop_id)
    references public.clients(id, barbershop_id) on delete set null (client_id),
  foreign key (professional_id, barbershop_id)
    references public.professionals(id, barbershop_id) on delete set null (professional_id),
  foreign key (transaction_id, barbershop_id)
    references public.financial_transactions(id, barbershop_id)
    on delete set null (transaction_id)
);

create index if not exists counter_sales_tenant_idx
  on public.counter_sales (barbershop_id, created_at desc);

create table if not exists public.counter_sale_items (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  sale_id uuid not null,
  product_id uuid not null,
  quantity integer not null check (quantity between 1 and 999),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  constraint counter_sale_items_unique unique (sale_id, product_id),
  foreign key (sale_id, barbershop_id)
    references public.counter_sales(id, barbershop_id) on delete cascade,
  foreign key (product_id, barbershop_id)
    references public.products(id, barbershop_id) on delete restrict
);

create index if not exists counter_sale_items_product_idx
  on public.counter_sale_items (barbershop_id, product_id, created_at desc);

alter table public.counter_sales enable row level security;
alter table public.counter_sale_items enable row level security;

-- Leitura para a equipe; escrita apenas pela RPC transacional.
drop policy if exists "staff read counter sales" on public.counter_sales;
create policy "staff read counter sales"
on public.counter_sales for select to authenticated
using (
  public.has_barbershop_role(
    barbershop_id,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  )
);

drop policy if exists "staff read counter sale items" on public.counter_sale_items;
create policy "staff read counter sale items"
on public.counter_sale_items for select to authenticated
using (
  public.has_barbershop_role(
    barbershop_id,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  )
);

-- Venda de balcão numa transação só: itens, baixa no estoque e receita.
-- Sem forma de pagamento a receita nasce pendente ("a receber") — mesma
-- regra da verdade financeira da Fase 0.
create or replace function public.create_counter_sale(
  p_barbershop uuid,
  p_items jsonb,
  p_client_id uuid default null,
  p_professional_id uuid default null,
  p_discount numeric default 0,
  p_payment_method public.payment_method default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_price numeric(12,2);
  v_name text;
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2);
  v_total numeric(12,2);
  v_sale_id uuid;
  v_transaction_id uuid;
  v_lines integer := 0;
  v_units integer := 0;
  v_client_name text;
begin
  if not public.has_barbershop_role(
    p_barbershop,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'CART_TOO_LARGE' using errcode = 'P0001';
  end if;
  if p_client_id is not null and not exists (
    select 1 from public.clients c
    where c.id = p_client_id and c.barbershop_id = p_barbershop
  ) then
    raise exception 'CLIENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_professional_id is not null and not exists (
    select 1 from public.professionals pr
    where pr.id = p_professional_id and pr.barbershop_id = p_barbershop
  ) then
    raise exception 'PROFESSIONAL_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.counter_sales
    (barbershop_id, client_id, professional_id, subtotal, discount, total,
     payment_method, notes, created_by)
  values
    (p_barbershop, p_client_id, p_professional_id, 0, 0, 0,
     p_payment_method, nullif(trim(p_notes), ''), public.current_profile_id())
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item ->> 'productId')::uuid;
    exception when others then
      raise exception 'INVALID_PRODUCT' using errcode = 'P0001';
    end;
    v_quantity := coalesce((v_item ->> 'quantity')::integer, 0);
    if v_quantity < 1 or v_quantity > 999 then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
    end if;

    select pd.sale_price, pd.name into v_price, v_name
    from public.products pd
    where pd.id = v_product_id and pd.barbershop_id = p_barbershop and pd.active;
    if v_price is null then
      raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0001';
    end if;

    insert into public.counter_sale_items
      (barbershop_id, sale_id, product_id, quantity, unit_price)
    values
      (p_barbershop, v_sale_id, v_product_id, v_quantity, v_price);

    -- A trava de estoque negativo é o trigger da Fase 0.8
    -- (trg_enforce_inventory_balance): se faltar saldo, INSUFFICIENT_STOCK
    -- derruba a venda inteira, itens e receita junto.
    insert into public.inventory_movements
      (barbershop_id, product_id, type, quantity, reason, created_by)
    values
      (p_barbershop, v_product_id, 'sale', v_quantity,
       'Venda de balcão', public.current_profile_id());

    v_subtotal := v_subtotal + (v_price * v_quantity);
    v_lines := v_lines + 1;
    v_units := v_units + v_quantity;
  end loop;

  v_discount := round(greatest(coalesce(p_discount, 0), 0), 2);
  if v_discount > v_subtotal then
    raise exception 'DISCOUNT_TOO_LARGE' using errcode = 'P0001';
  end if;
  v_total := v_subtotal - v_discount;
  if v_total <= 0 then
    raise exception 'ZERO_TOTAL' using errcode = 'P0001';
  end if;

  if p_client_id is not null then
    select c.name into v_client_name
    from public.clients c where c.id = p_client_id;
  end if;

  insert into public.financial_transactions
    (barbershop_id, type, status, category, description, amount,
     payment_method, paid_at, created_by)
  values
    (p_barbershop, 'income',
     case when p_payment_method is null then 'pending' else 'paid' end,
     'product',
     'Venda de balcão — ' || v_units || ' item' ||
       case when v_units = 1 then '' else 'ns' end ||
       coalesce(' — ' || v_client_name, ''),
     v_total,
     p_payment_method,
     case when p_payment_method is null then null else now() end,
     public.current_profile_id())
  returning id into v_transaction_id;

  update public.counter_sales
  set subtotal = v_subtotal,
      discount = v_discount,
      total = v_total,
      transaction_id = v_transaction_id
  where id = v_sale_id;

  insert into public.audit_logs
    (barbershop_id, actor_profile_id, action, entity_type, entity_id, metadata)
  values
    (p_barbershop, public.current_profile_id(), 'counter_sale.created',
     'counter_sale', v_sale_id,
     jsonb_build_object('lines', v_lines, 'units', v_units, 'total', v_total,
                        'paid', p_payment_method is not null));

  return jsonb_build_object(
    'saleId', v_sale_id,
    'total', v_total,
    'paid', p_payment_method is not null
  );
end;
$$;
revoke all on function public.create_counter_sale(
  uuid, jsonb, uuid, uuid, numeric, public.payment_method, text
) from public, anon;
grant execute on function public.create_counter_sale(
  uuid, jsonb, uuid, uuid, numeric, public.payment_method, text
) to authenticated;

-- Atalhos dos mais vendidos: as duas fontes de venda, últimos 90 dias.
create or replace function public.get_top_products(
  p_barbershop uuid,
  p_limit integer default 6
)
returns table (product_id uuid, units numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select s.product_id, sum(s.units)::numeric as units
  from (
    select ci.product_id, ci.quantity::numeric as units
    from public.counter_sale_items ci
    where ci.barbershop_id = p_barbershop
      and ci.created_at >= now() - interval '90 days'
    union all
    select ap.product_id, ap.quantity::numeric
    from public.appointment_products ap
    where ap.barbershop_id = p_barbershop
      and ap.status = 'confirmed'
      and ap.confirmed_at >= now() - interval '90 days'
  ) s
  group by s.product_id
  order by sum(s.units) desc
  limit least(greatest(coalesce(p_limit, 6), 1), 24);
$$;
revoke all on function public.get_top_products(uuid, integer) from public, anon;
grant execute on function public.get_top_products(uuid, integer) to authenticated;

-- O relatório do Financeiro é o revenue_breakdown da Fase 0, que só conhecia
-- a reserva do agendamento. Sem esta reescrita, uma venda de balcão entraria
-- no total do mês e sumiria da tabela "Vendas de produtos" ao lado dele.
-- O desconto é da venda inteira; rateado por item, a soma da tabela fecha
-- com o "vendido" em vez de ficar sempre maior.
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
  with product_lines as (
    -- Porta 1: produto reservado no agendamento e confirmado no balcão.
    select ap.product_id,
           a.professional_id,
           (ap.quantity * ap.unit_price)::numeric as total,
           ap.quantity::numeric as quantity
    from public.appointment_products ap
    join public.appointments a on a.id = ap.appointment_id
    where ap.barbershop_id = p_barbershop
      and ap.status = 'confirmed'
      and ap.confirmed_at >= p_from and ap.confirmed_at < p_to

    union all

    -- Porta 2: venda de balcão (Fase 2.6), com o vendedor escolhido na tela.
    select ci.product_id,
           cs.professional_id,
           (ci.quantity * ci.unit_price
             * case when cs.subtotal > 0 then cs.total / cs.subtotal else 1 end
           )::numeric,
           ci.quantity::numeric
    from public.counter_sale_items ci
    join public.counter_sales cs on cs.id = ci.sale_id
    where ci.barbershop_id = p_barbershop
      and ci.created_at >= p_from and ci.created_at < p_to
  )
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
         coalesce(sum(pl.total), 0)::numeric,
         coalesce(sum(pl.quantity), 0)::numeric
  from product_lines pl
  join public.products pd on pd.id = pl.product_id
  group by pd.id, pd.name

  union all

  -- Produto vendido, por profissional — o painel mostra os dois cortes lado
  -- a lado. Venda de balcão sem vendedor escolhido não entra neste corte.
  select 'product_professional'::text, pr.id, pr.name,
         coalesce(sum(pl.total), 0)::numeric,
         coalesce(sum(pl.quantity), 0)::numeric
  from product_lines pl
  join public.professionals pr on pr.id = pl.professional_id
  group by pr.id, pr.name;
$$;
revoke all on function public.revenue_breakdown(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.revenue_breakdown(uuid, timestamptz, timestamptz)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. "Finalizar e receber" (item 2.2): concluir e capturar o pagamento no
--    mesmo gesto. Serviço coberto por plano não gera cobrança — a RPC
--    devolve `covered` e o balcão não pede dinheiro.
create or replace function public.complete_and_receive_appointment(
  p_appointment_id uuid,
  p_payment_method public.payment_method
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_transaction record;
begin
  select ap.id, ap.barbershop_id, ap.professional_id, ap.status, ap.starts_at
  into a
  from public.appointments ap
  where ap.id = p_appointment_id;

  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not (
    public.has_barbershop_role(
      a.barbershop_id,
      array['owner', 'manager', 'receptionist']::public.membership_role[]
    )
    or public.is_own_professional(a.professional_id)
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if a.status not in ('confirmed', 'in_progress') then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  -- O trigger sync_completed_appointment_income cria a receita pendente
  -- (ou consome o benefício do plano, sem receita nenhuma).
  update public.appointments set status = 'completed' where id = a.id;

  select ft.id, ft.amount, ft.status into v_transaction
  from public.financial_transactions ft
  where ft.appointment_id = a.id
    and ft.type = 'income'
    and ft.category = 'service'
  limit 1;

  if v_transaction.id is null then
    return jsonb_build_object('received', 0, 'covered', true);
  end if;
  if v_transaction.status = 'paid' then
    return jsonb_build_object('received', 0, 'covered', false,
                              'alreadyPaid', true);
  end if;

  update public.financial_transactions
  set status = 'paid',
      payment_method = p_payment_method,
      paid_at = now()
  where id = v_transaction.id;

  return jsonb_build_object(
    'received', v_transaction.amount,
    'covered', false
  );
end;
$$;
revoke all on function public.complete_and_receive_appointment(
  uuid, public.payment_method
) from public, anon;
grant execute on function public.complete_and_receive_appointment(
  uuid, public.payment_method
) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Inteligência de clientes v3 (itens 2.4 e 2.5).
--
-- Parte da versão da Fase 0 (que já corrigiu o gasto do assinante, §0.13) e
-- acrescenta o que a Fase 2 precisa:
--   a) segmentos 'assinantes' e 'inadimplentes' — prometidos na Fase 3 do
--      plano antigo, adiados para a 4 e nunca entregues;
--   b) colunas membership_status / membership_plan_name / membership_period_end,
--      para a situação do plano aparecer por linha e no perfil;
--   c) notes e no_show_count, que o perfil do cliente exibe;
--   d) p_client_id, que devolve UM cliente sem filtro de segmento — é a mesma
--      fonte de verdade alimentando /clientes e /clientes/[id];
--   e) a venda de balcão (Fase 2.6) no gasto do cliente. Ela entra pela
--      financial_transactions sem appointment_id, igual à mensalidade do
--      plano, então precisa do mesmo tratamento por transaction_id.
drop function if exists public.get_client_insights(uuid, text, text, integer, integer);
create function public.get_client_insights(
  p_barbershop uuid,
  p_segment text default 'todos',
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0,
  p_client_id uuid default null
)
returns table (
  id uuid,
  name text,
  phone text,
  email text,
  active boolean,
  contact_opt_out boolean,
  notes text,
  last_completed_at timestamptz,
  days_since integer,
  completed_count bigint,
  no_show_count bigint,
  total_spent numeric,
  avg_ticket numeric,
  top_service text,
  top_professional text,
  median_interval_days integer,
  expected_return_at timestamptz,
  confidence text,
  last_contact_at timestamptz,
  last_contact_outcome text,
  membership_status text,
  membership_plan_name text,
  membership_period_end timestamptz,
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
                       'sem_voltar_60', 'assinantes', 'inadimplentes',
                       'arquivados') then
    raise exception 'INVALID_SEGMENT' using errcode = 'P0001';
  end if;

  v_phone_search := regexp_replace(coalesce(v_search, ''), '\D', '', 'g');

  return query
  with visits as (
    select a.client_id,
           a.starts_at,
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
  faults as (
    select a.client_id, count(*) as no_show_count
    from public.appointments a
    where a.barbershop_id = p_barbershop and a.status = 'no_show'
    group by a.client_id
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
    union all
    -- Venda de balcão identificada (Fase 2.6): mesmo caso da mensalidade —
    -- receita sem agendamento, ligada ao cliente pela venda.
    select cs.client_id, ft.amount
    from public.counter_sales cs
    join public.financial_transactions ft on ft.id = cs.transaction_id
    where cs.barbershop_id = p_barbershop
      and cs.client_id is not null
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
  plans as (
    select distinct on (m.client_id)
           m.client_id,
           m.status,
           m.current_period_end,
           pl.name as plan_name
    from public.customer_memberships m
    join public.customer_membership_plans pl on pl.id = m.plan_id
    where m.barbershop_id = p_barbershop
      and m.status in ('active', 'paused')
    order by m.client_id, m.current_period_end desc
  ),
  enriched as (
    select
      c.id, c.name, c.phone, c.email, c.active, c.contact_opt_out, c.notes,
      ag.last_completed_at,
      case when ag.last_completed_at is null then null
        else floor(extract(epoch from (now() - ag.last_completed_at)) / 86400)::integer
      end as days_since,
      coalesce(ag.completed_count, 0) as completed_count,
      coalesce(fa.no_show_count, 0) as no_show_count,
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
      ct.outcome as last_contact_outcome,
      -- Situação do plano com os quatro estados do §7.4 (o amarelo
      -- "vence em breve" não existia no modelo).
      case
        when pn.client_id is null then null
        when pn.status = 'paused' then 'paused'
        when pn.current_period_end < now() then 'past_due'
        when pn.current_period_end < now() + interval '7 days' then 'due_soon'
        else 'active'
      end as membership_status,
      pn.plan_name as membership_plan_name,
      pn.current_period_end as membership_period_end
    from public.clients c
    left join agg ag on ag.client_id = c.id
    left join faults fa on fa.client_id = c.id
    left join spend sp on sp.client_id = c.id
    left join contacts ct on ct.client_id = c.id
    left join plans pn on pn.client_id = c.id
    where c.barbershop_id = p_barbershop
      and (p_client_id is null or c.id = p_client_id)
      and (v_search is null
        or c.name ilike '%' || v_search || '%'
        or (length(v_phone_search) >= 4
            and c.phone_normalized like '%' || v_phone_search || '%'))
  ),
  filtered as (
    select e.* from enriched e
    -- Consulta por id devolve o cliente como ele está, inclusive arquivado:
    -- o perfil precisa abrir mesmo depois de arquivar.
    where p_client_id is not null or case p_segment
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
      when 'assinantes' then e.active and e.membership_status is not null
      when 'inadimplentes' then e.active and e.membership_status = 'past_due'
      else e.active
    end
  )
  select f.id, f.name, f.phone, f.email, f.active, f.contact_opt_out, f.notes,
         f.last_completed_at, f.days_since, f.completed_count, f.no_show_count,
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
         f.membership_status, f.membership_plan_name, f.membership_period_end,
         count(*) over () as total_count
  from filtered f
  order by
    case when p_segment in ('para_chamar', 'atrasados', 'proximos')
      then f.expected_return_at end asc nulls last,
    case when p_segment = 'inadimplentes'
      then f.membership_period_end end asc nulls last,
    case when p_segment = 'sem_voltar_60' then f.days_since end desc nulls last,
    f.name asc
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;
revoke all on function public.get_client_insights(
  uuid, text, text, integer, integer, uuid
) from public, anon;
grant execute on function public.get_client_insights(
  uuid, text, text, integer, integer, uuid
) to authenticated;


-- count_clients_to_call chamava a assinatura antiga (5 argumentos).
create or replace function public.count_clients_to_call(p_barbershop uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select g.total_count
    from public.get_client_insights(p_barbershop, 'para_chamar', null, 1, 0, null) g
    limit 1
  ), 0)::integer;
$$;
revoke all on function public.count_clients_to_call(uuid) from public, anon;
grant execute on function public.count_clients_to_call(uuid) to authenticated;

-- Contagem de planos vencendo / vencidos, para o bloco "Precisa da sua
-- atenção" do Início (item 2.3) e o indicador de /clientes.
create or replace function public.count_memberships_attention(
  p_barbershop uuid,
  p_days integer default 7
)
returns table (due_soon integer, past_due integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (
      where m.current_period_end >= now()
        and m.current_period_end < now() + make_interval(days => greatest(coalesce(p_days, 7), 1))
    )::integer,
    count(*) filter (where m.current_period_end < now())::integer
  from public.customer_memberships m
  where m.barbershop_id = p_barbershop
    and m.status = 'active'
    and public.has_barbershop_role(
      p_barbershop,
      array['owner', 'manager', 'receptionist']::public.membership_role[]
    );
$$;
revoke all on function public.count_memberships_attention(uuid, integer)
  from public, anon;
grant execute on function public.count_memberships_attention(uuid, integer)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Perfil do cliente (item 2.4): histórico de atendimentos e o dinheiro
--    que ele já deixou na casa.
create or replace function public.get_client_history(
  p_barbershop uuid,
  p_client_id uuid,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  starts_at timestamptz,
  status public.appointment_status,
  service_name text,
  professional_name text,
  amount numeric,
  payment_status public.financial_status,
  payment_method public.payment_method,
  covered_by_plan boolean,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_barbershop_role(
    p_barbershop,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  return query
  select a.id, a.starts_at, a.status, s.name, pr.name,
         ft.amount, ft.status, ft.payment_method,
         (mu.appointment_id is not null) as covered_by_plan,
         count(*) over () as total_count
  from public.appointments a
  left join public.services s on s.id = a.service_id
  left join public.professionals pr on pr.id = a.professional_id
  left join public.financial_transactions ft
    on ft.appointment_id = a.id and ft.type = 'income' and ft.category = 'service'
  left join public.membership_usage mu on mu.appointment_id = a.id
  where a.barbershop_id = p_barbershop and a.client_id = p_client_id
  order by a.starts_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;
revoke all on function public.get_client_history(uuid, uuid, integer, integer)
  from public, anon;
grant execute on function public.get_client_history(uuid, uuid, integer, integer)
  to authenticated;

-- A aba "Plano" do perfil precisa de UM contrato, não dos 500 do tenant.
-- Argumento com default exigiria drop (senão a chamada de 1 argumento fica
-- ambígua entre as duas assinaturas).
drop function if exists public.get_membership_overview(uuid);
create function public.get_membership_overview(
  p_barbershop uuid,
  p_client_id uuid default null
)
returns table (
  id uuid,
  client_id uuid,
  client_name text,
  client_phone text,
  plan_id uuid,
  plan_name text,
  period text,
  price numeric,
  status text,
  effective_status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  usage jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_barbershop_role(
    p_barbershop,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  return query
  select
    m.id,
    m.client_id,
    c.name,
    c.phone,
    m.plan_id,
    pl.name,
    pl.period,
    m.price,
    m.status,
    case
      when m.status = 'active' and m.current_period_end < now() then 'past_due'
      when m.status = 'active'
        and m.current_period_end < now() + interval '7 days' then 'due_soon'
      else m.status
    end as effective_status,
    m.current_period_start,
    m.current_period_end,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'serviceId', e.service_id,
        'serviceName', s.name,
        'limit', e.uses_per_period,
        'used', (
          select count(*)
          from public.membership_usage u
          where u.membership_id = m.id
            and u.service_id = e.service_id
            and u.used_at >= m.current_period_start
            and u.used_at < m.current_period_end
        )
      ) order by s.name)
      from public.membership_entitlements e
      join public.services s on s.id = e.service_id
      where e.plan_id = m.plan_id
    ), '[]'::jsonb) as usage
  from public.customer_memberships m
  join public.clients c on c.id = m.client_id
  join public.customer_membership_plans pl on pl.id = m.plan_id
  where m.barbershop_id = p_barbershop
    and m.status <> 'canceled'
    and (p_client_id is null or m.client_id = p_client_id)
  order by
    case when m.status = 'active' and m.current_period_end < now()
      then 0 else 1 end,
    m.current_period_end asc
  limit 500;
end;
$$;
revoke all on function public.get_membership_overview(uuid, uuid)
  from public, anon;
grant execute on function public.get_membership_overview(uuid, uuid)
  to authenticated;

-- Aba "Valores": tudo o que o cliente já pagou, das três fontes.
create or replace function public.get_client_payments(
  p_barbershop uuid,
  p_client_id uuid,
  p_limit integer default 20
)
returns table (
  paid_at timestamptz,
  description text,
  amount numeric,
  payment_method public.payment_method,
  source text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_barbershop_role(
    p_barbershop,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  return query
  select * from (
    select ft.paid_at, ft.description, ft.amount, ft.payment_method,
           ft.category as source
    from public.financial_transactions ft
    join public.appointments a on a.id = ft.appointment_id
    where ft.barbershop_id = p_barbershop
      and a.client_id = p_client_id
      and ft.type = 'income' and ft.status = 'paid'
    union all
    -- Pela financial_transactions, e não por cs.payment_method: venda
    -- estornada depois não pode continuar aparecendo como dinheiro pago.
    select ft.paid_at, 'Venda de balcão', ft.amount, ft.payment_method,
           'product'
    from public.counter_sales cs
    join public.financial_transactions ft on ft.id = cs.transaction_id
    where cs.barbershop_id = p_barbershop
      and cs.client_id = p_client_id
      and ft.type = 'income' and ft.status = 'paid'
    union all
    select ft.paid_at, 'Plano ' || pl.name, ft.amount, ft.payment_method,
           'membership'
    from public.membership_payments mp
    join public.customer_memberships m on m.id = mp.membership_id
    join public.customer_membership_plans pl on pl.id = m.plan_id
    join public.financial_transactions ft on ft.id = mp.transaction_id
    where mp.barbershop_id = p_barbershop and m.client_id = p_client_id
      and ft.type = 'income' and ft.status = 'paid'
  ) pay
  order by pay.paid_at desc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
end;
$$;
revoke all on function public.get_client_payments(uuid, uuid, integer)
  from public, anon;
grant execute on function public.get_client_payments(uuid, uuid, integer)
  to authenticated;

commit;
