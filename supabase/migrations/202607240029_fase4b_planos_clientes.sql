-- Fase 4B — Planos vendidos aos clientes da barbearia (clube de assinatura).
--
-- Funcionalidade DIFERENTE da assinatura do SaaS (subscriptions): aqui a
-- barbearia vende um plano recorrente ao cliente final (ex.: "2 cortes por
-- mês por R$ 89,90"), cobrado no balcão.
--
-- Decisões registradas (docs/05):
-- 1) Venda e renovação exigem pagamento na hora (forma de pagamento
--    obrigatória) — clube é pré-pago; não existe "plano fiado". A receita
--    entra como transação paga (categoria 'membership') na mesma fonte de
--    verdade do financeiro.
-- 2) Inadimplência é DERIVADA do vencimento: status 'active' com
--    current_period_end < now() é exibido como "Vencido" e o benefício
--    deixa de valer — nenhum cron precisa rodar para a verdade valer.
-- 3) Benefício só para cliente identificado e elegível: aplicado na
--    CONCLUSÃO do atendimento (trigger). Serviço coberto pelo plano não
--    gera nova receita (já foi pago no plano) e consome 1 uso do período.
--    Esgotou o limite / venceu / pausou → o atendimento gera receita
--    normal. A página pública nunca mostra serviço a R$ 0.
-- 4) Desfazer a conclusão devolve o uso consumido (o registro é derivado).
-- 5) Pausa suspende o benefício sem esticar a vigência (v1 simples e
--    honesta); cancelamento é final e não apaga histórico.
-- 6) Preço é congelado na venda (mudar o plano não muda contratos ativos);
--    renovação cobra o preço congelado do contrato.
-- 7) Um cliente tem no máximo UM plano em aberto (active/paused) por vez.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Catálogo de planos do tenant.
create table if not exists public.customer_membership_plans (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text check (description is null or char_length(description) <= 400),
  price numeric(12,2) not null check (price > 0),
  period text not null default 'monthly'
    check (period in ('monthly', 'quarterly', 'yearly')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_membership_plans_id_barbershop_key unique (id, barbershop_id)
);

create index if not exists customer_membership_plans_tenant_idx
  on public.customer_membership_plans (barbershop_id, active);

-- Serviços incluídos + limite de usos por período.
create table if not exists public.membership_entitlements (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  plan_id uuid not null,
  service_id uuid not null,
  uses_per_period integer not null default 1
    check (uses_per_period between 1 and 99),
  created_at timestamptz not null default now(),
  constraint membership_entitlements_plan_service_key unique (plan_id, service_id),
  foreign key (plan_id, barbershop_id)
    references public.customer_membership_plans(id, barbershop_id) on delete cascade,
  foreign key (service_id, barbershop_id)
    references public.services(id, barbershop_id) on delete cascade
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Contratos (cliente × plano).
create table if not exists public.customer_memberships (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  client_id uuid not null,
  plan_id uuid not null,
  status text not null default 'active'
    check (status in ('active', 'paused', 'canceled')),
  -- Preço congelado no momento da venda.
  price numeric(12,2) not null check (price > 0),
  started_at timestamptz not null default now(),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  paused_at timestamptz,
  canceled_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_memberships_id_barbershop_key unique (id, barbershop_id),
  constraint customer_memberships_period_valid
    check (current_period_end > current_period_start),
  foreign key (client_id, barbershop_id)
    references public.clients(id, barbershop_id) on delete cascade,
  foreign key (plan_id, barbershop_id)
    references public.customer_membership_plans(id, barbershop_id) on delete restrict
);

-- Um plano em aberto por cliente.
create unique index if not exists customer_memberships_one_open_per_client
  on public.customer_memberships (barbershop_id, client_id)
  where status in ('active', 'paused');

create index if not exists customer_memberships_tenant_idx
  on public.customer_memberships (barbershop_id, status, current_period_end);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Pagamentos do plano (ledger por período; ligado ao financeiro).
create table if not exists public.membership_payments (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  membership_id uuid not null,
  amount numeric(12,2) not null check (amount > 0),
  payment_method public.payment_method not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  transaction_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  paid_at timestamptz not null default now(),
  -- Um pagamento por período do contrato (renovar duas vezes não duplica).
  constraint membership_payments_period_key unique (membership_id, period_start),
  foreign key (membership_id, barbershop_id)
    references public.customer_memberships(id, barbershop_id) on delete cascade,
  foreign key (transaction_id, barbershop_id)
    references public.financial_transactions(id, barbershop_id)
    on delete set null (transaction_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Uso do período (derivado da conclusão de atendimentos).
create table if not exists public.membership_usage (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  membership_id uuid not null,
  service_id uuid not null,
  appointment_id uuid not null,
  used_at timestamptz not null default now(),
  -- Um atendimento consome no máximo um uso.
  constraint membership_usage_appointment_key unique (appointment_id),
  foreign key (membership_id, barbershop_id)
    references public.customer_memberships(id, barbershop_id) on delete cascade,
  foreign key (service_id, barbershop_id)
    references public.services(id, barbershop_id) on delete restrict,
  foreign key (appointment_id, barbershop_id)
    references public.appointments(id, barbershop_id) on delete cascade
);

create index if not exists membership_usage_period_idx
  on public.membership_usage (membership_id, service_id, used_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS: leitura para a equipe de balcão; escrita apenas pelas RPCs
--    (security definer) — exceto o catálogo de planos, gerenciado direto
--    pelo dono/gerente.
alter table public.customer_membership_plans enable row level security;
alter table public.membership_entitlements enable row level security;
alter table public.customer_memberships enable row level security;
alter table public.membership_payments enable row level security;
alter table public.membership_usage enable row level security;

drop policy if exists "staff read membership plans" on public.customer_membership_plans;
create policy "staff read membership plans"
on public.customer_membership_plans for select to authenticated
using (
  public.has_barbershop_role(
    barbershop_id,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  )
);

drop policy if exists "managers write membership plans" on public.customer_membership_plans;
create policy "managers write membership plans"
on public.customer_membership_plans for all to authenticated
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

drop policy if exists "staff read entitlements" on public.membership_entitlements;
create policy "staff read entitlements"
on public.membership_entitlements for select to authenticated
using (
  public.has_barbershop_role(
    barbershop_id,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  )
);

drop policy if exists "managers write entitlements" on public.membership_entitlements;
create policy "managers write entitlements"
on public.membership_entitlements for all to authenticated
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

drop policy if exists "staff read memberships" on public.customer_memberships;
create policy "staff read memberships"
on public.customer_memberships for select to authenticated
using (
  public.has_barbershop_role(
    barbershop_id,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  )
);

drop policy if exists "staff read membership payments" on public.membership_payments;
create policy "staff read membership payments"
on public.membership_payments for select to authenticated
using (
  public.has_barbershop_role(
    barbershop_id,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  )
);

drop policy if exists "staff read membership usage" on public.membership_usage;
create policy "staff read membership usage"
on public.membership_usage for select to authenticated
using (
  public.has_barbershop_role(
    barbershop_id,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Helper de vigência.
create or replace function public.membership_period_interval(p_period text)
returns interval
language sql
immutable
set search_path = public
as $$
  select case p_period
    when 'monthly' then interval '1 month'
    when 'quarterly' then interval '3 months'
    when 'yearly' then interval '1 year'
  end;
$$;
revoke all on function public.membership_period_interval(text)
  from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Venda do plano (balcão): contrato + pagamento + receita, transacional.
create or replace function public.sell_customer_membership(
  p_client_id uuid,
  p_plan_id uuid,
  p_payment_method public.payment_method
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
  v_client_name text;
  v_membership_id uuid;
  v_transaction_id uuid;
  v_period_end timestamptz;
begin
  if p_payment_method is null then
    raise exception 'PAYMENT_METHOD_REQUIRED' using errcode = 'P0001';
  end if;

  select pl.id, pl.barbershop_id, pl.name, pl.price, pl.period, pl.active
  into p
  from public.customer_membership_plans pl
  where pl.id = p_plan_id;

  if not found or not p.active then
    raise exception 'PLAN_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not public.has_barbershop_role(
    p.barbershop_id,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  select c.name into v_client_name
  from public.clients c
  where c.id = p_client_id and c.barbershop_id = p.barbershop_id and c.active;
  if v_client_name is null then
    raise exception 'CLIENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.customer_memberships m
    where m.barbershop_id = p.barbershop_id
      and m.client_id = p_client_id
      and m.status in ('active', 'paused')
  ) then
    raise exception 'MEMBERSHIP_ALREADY_ACTIVE' using errcode = 'P0001';
  end if;

  v_period_end := now() + public.membership_period_interval(p.period);

  insert into public.customer_memberships
    (barbershop_id, client_id, plan_id, status, price,
     current_period_start, current_period_end, created_by)
  values
    (p.barbershop_id, p_client_id, p_plan_id, 'active', p.price,
     now(), v_period_end, public.current_profile_id())
  returning id into v_membership_id;

  insert into public.financial_transactions
    (barbershop_id, type, status, category, description, amount, paid_at,
     payment_method, created_by)
  values
    (p.barbershop_id, 'income', 'paid', 'membership',
     'Plano ' || p.name || ' — ' || v_client_name,
     p.price, now(), p_payment_method, public.current_profile_id())
  returning id into v_transaction_id;

  insert into public.membership_payments
    (barbershop_id, membership_id, amount, payment_method,
     period_start, period_end, transaction_id, created_by)
  select m.barbershop_id, m.id, m.price, p_payment_method,
         m.current_period_start, m.current_period_end, v_transaction_id,
         public.current_profile_id()
  from public.customer_memberships m
  where m.id = v_membership_id;

  insert into public.audit_logs
    (barbershop_id, actor_profile_id, action, entity_type, entity_id, metadata)
  values
    (p.barbershop_id, public.current_profile_id(), 'membership.sold',
     'customer_membership', v_membership_id,
     jsonb_build_object('plan', p.name, 'price', p.price,
                        'period_end', v_period_end));

  return jsonb_build_object('id', v_membership_id, 'periodEnd', v_period_end);
end;
$$;
revoke all on function public.sell_customer_membership(uuid, uuid, public.payment_method)
  from public, anon;
grant execute on function public.sell_customer_membership(uuid, uuid, public.payment_method)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Renovação (cobrança do período seguinte): renovar antes do vencimento
--    estende a partir do fim vigente; renovar depois começa agora.
create or replace function public.renew_customer_membership(
  p_membership_id uuid,
  p_payment_method public.payment_method
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  v_plan record;
  v_start timestamptz;
  v_end timestamptz;
  v_transaction_id uuid;
begin
  if p_payment_method is null then
    raise exception 'PAYMENT_METHOD_REQUIRED' using errcode = 'P0001';
  end if;

  select cm.id, cm.barbershop_id, cm.client_id, cm.plan_id, cm.status,
         cm.price, cm.current_period_end
  into m
  from public.customer_memberships cm
  where cm.id = p_membership_id;

  if not found then
    raise exception 'MEMBERSHIP_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not public.has_barbershop_role(
    m.barbershop_id,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if m.status <> 'active' then
    raise exception 'MEMBERSHIP_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  select pl.name, pl.period into v_plan
  from public.customer_membership_plans pl
  where pl.id = m.plan_id;

  v_start := greatest(m.current_period_end, now());
  v_end := v_start + public.membership_period_interval(v_plan.period);

  insert into public.financial_transactions
    (barbershop_id, type, status, category, description, amount, paid_at,
     payment_method, created_by)
  select m.barbershop_id, 'income', 'paid', 'membership',
         'Plano ' || v_plan.name || ' — ' || c.name || ' (renovação)',
         m.price, now(), p_payment_method, public.current_profile_id()
  from public.clients c
  where c.id = m.client_id
  returning id into v_transaction_id;

  insert into public.membership_payments
    (barbershop_id, membership_id, amount, payment_method,
     period_start, period_end, transaction_id, created_by)
  values
    (m.barbershop_id, m.id, m.price, p_payment_method,
     v_start, v_end, v_transaction_id, public.current_profile_id());

  update public.customer_memberships
  set current_period_start = v_start,
      current_period_end = v_end,
      updated_at = now()
  where id = m.id;

  insert into public.audit_logs
    (barbershop_id, actor_profile_id, action, entity_type, entity_id, metadata)
  values
    (m.barbershop_id, public.current_profile_id(), 'membership.renewed',
     'customer_membership', m.id,
     jsonb_build_object('amount', m.price, 'period_start', v_start,
                        'period_end', v_end));

  return jsonb_build_object('periodStart', v_start, 'periodEnd', v_end);
end;
$$;
revoke all on function public.renew_customer_membership(uuid, public.payment_method)
  from public, anon;
grant execute on function public.renew_customer_membership(uuid, public.payment_method)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Pausa / retomada / cancelamento (owner e manager), com auditoria.
create or replace function public.set_customer_membership_status(
  p_membership_id uuid,
  p_action text -- 'pause' | 'resume' | 'cancel'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
begin
  if p_action not in ('pause', 'resume', 'cancel') then
    raise exception 'INVALID_ACTION' using errcode = 'P0001';
  end if;

  select cm.id, cm.barbershop_id, cm.status
  into m
  from public.customer_memberships cm
  where cm.id = p_membership_id;

  if not found then
    raise exception 'MEMBERSHIP_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not public.has_barbershop_role(
    m.barbershop_id, array['owner', 'manager']::public.membership_role[]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if m.status = 'canceled' then
    if p_action = 'cancel' then
      return; -- idempotente
    end if;
    raise exception 'MEMBERSHIP_CANCELED' using errcode = 'P0001';
  end if;

  if p_action = 'pause' then
    if m.status = 'paused' then
      return;
    end if;
    update public.customer_memberships
    set status = 'paused', paused_at = now(), updated_at = now()
    where id = m.id;
  elsif p_action = 'resume' then
    if m.status = 'active' then
      return;
    end if;
    update public.customer_memberships
    set status = 'active', paused_at = null, updated_at = now()
    where id = m.id;
  else
    update public.customer_memberships
    set status = 'canceled', canceled_at = now(), updated_at = now()
    where id = m.id;
  end if;

  insert into public.audit_logs
    (barbershop_id, actor_profile_id, action, entity_type, entity_id, metadata)
  values
    (m.barbershop_id, public.current_profile_id(), 'membership.' || p_action,
     'customer_membership', m.id,
     jsonb_build_object('previous_status', m.status));
end;
$$;
revoke all on function public.set_customer_membership_status(uuid, text)
  from public, anon;
grant execute on function public.set_customer_membership_status(uuid, text)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Visão operacional: contratos com situação efetiva e uso do período.
create or replace function public.get_membership_overview(p_barbershop uuid)
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
  order by
    case when m.status = 'active' and m.current_period_end < now()
      then 0 else 1 end,
    m.current_period_end asc
  limit 500;
end;
$$;
revoke all on function public.get_membership_overview(uuid) from public, anon;
grant execute on function public.get_membership_overview(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. Benefício na conclusão do atendimento: serviço coberto por plano
--     vigente consome uso e NÃO gera nova receita (já foi pago no plano).
--     Desfazer a conclusão devolve o uso. Demais casos seguem a Fase 0.
create or replace function public.sync_completed_appointment_income()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_price numeric;
  v_service_name text;
  v_client_name text;
  v_membership_id uuid;
begin
  if new.status = 'completed' and (old.status is distinct from new.status) then
    if exists (
      select 1 from public.financial_transactions
      where appointment_id = new.id and type = 'income' and category = 'service'
    ) then
      return new;
    end if;

    -- Cliente identificado com plano vigente cobrindo o serviço e uso
    -- disponível no período? Consome o benefício em vez de gerar receita.
    select m.id into v_membership_id
    from public.customer_memberships m
    join public.membership_entitlements e
      on e.plan_id = m.plan_id and e.service_id = new.service_id
    where m.barbershop_id = new.barbershop_id
      and m.client_id = new.client_id
      and m.status = 'active'
      and now() >= m.current_period_start
      and now() < m.current_period_end
      and (
        select count(*) from public.membership_usage u
        where u.membership_id = m.id
          and u.service_id = e.service_id
          and u.used_at >= m.current_period_start
          and u.used_at < m.current_period_end
      ) < e.uses_per_period
    limit 1;

    if v_membership_id is not null then
      insert into public.membership_usage
        (barbershop_id, membership_id, service_id, appointment_id)
      values
        (new.barbershop_id, v_membership_id, new.service_id, new.id)
      on conflict (appointment_id) do nothing;
      return new;
    end if;

    select s.price, s.name into v_service_price, v_service_name
    from public.services s where s.id = new.service_id;
    select c.name into v_client_name
    from public.clients c where c.id = new.client_id;
    if coalesce(v_service_price, 0) <= 0 then
      return new;
    end if;
    -- Vendido, ainda não recebido: sem paid_at e sem forma de pagamento.
    insert into public.financial_transactions
      (barbershop_id, type, status, category, description, amount,
       appointment_id, created_by)
    values
      (new.barbershop_id, 'income', 'pending', 'service',
       coalesce(v_service_name, 'Atendimento') || ' — ' ||
         coalesce(v_client_name, 'Cliente'),
       v_service_price, new.id, new.created_by);
  elsif old.status = 'completed' and new.status = 'confirmed' then
    -- Correção do balcão: devolve o uso do plano consumido pela conclusão.
    delete from public.membership_usage where appointment_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.sync_completed_appointment_income()
  from public, anon, authenticated;

commit;
