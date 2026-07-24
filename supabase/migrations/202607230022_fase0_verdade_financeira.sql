-- Fase 0 — Verdade operacional e financeira.
--
-- 1) Concluir atendimento passa a criar a receita do serviço como PENDENTE
--    (vendido ≠ recebido). O recebimento acontece depois, com forma de
--    pagamento e paid_at, via confirmação explícita do operador.
-- 2) Venda de produto confirmada nasce pendente, salvo quando a mesma
--    operação captura a forma de pagamento (parâmetro novo e opcional).
-- 3) Transação paga exige paid_at (constraint) e transição nova para "paid"
--    de receita exige forma de pagamento (trigger). Dados históricos pagos
--    sem forma de pagamento são preservados e exibidos como "Não informado".
-- 4) Reserva pública ganha referência curta (public_reference) e a RPC
--    create_public_appointment passa a retornar {reference, status} — sem
--    expor o UUID interno nem dados privados.
-- 5) Serviços ganham "audience" (public | members | internal): serviço de
--    assinante ou interno não aparece na página nem no agendamento público.
-- 6) Cancelamento de agendamento preenche canceled_at automaticamente
--    (antes, o update violava appointments_cancellation_consistency e o
--    cancelamento falhava em silêncio).
-- 7) Rate limit compartilhado entre instâncias serverless (tabela + RPC,
--    executável apenas pelo service_role).
--
-- Rollback operacional: cada bloco pode ser revertido isoladamente —
-- recriar as funções na versão da migration 0010/0006, remover trigger e
-- constraint novos e (opcionalmente) manter colunas novas sem uso. Nenhum
-- dado é apagado por esta migration.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Receita de serviço nasce pendente ao concluir o atendimento.
--    Idempotência garantida pelo índice único
--    financial_transactions_service_income_key (migration 0013) e pelo
--    exists() abaixo. O preço aplicado é congelado no momento da conclusão:
--    mudanças futuras no catálogo não alteram vendas passadas.
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
begin
  if new.status = 'completed' and (old.status is distinct from new.status) then
    if exists (
      select 1 from public.financial_transactions
      where appointment_id = new.id and type = 'income' and category = 'service'
    ) then
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
  end if;
  return new;
end;
$$;
revoke all on function public.sync_completed_appointment_income()
  from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Consistência do "pago": paid_at obrigatório.
--    Backfill defensivo antes da constraint (dados históricos sempre tiveram
--    paid_at preenchido pelos fluxos atuais, mas ambientes antigos podem ter
--    exceções).
update public.financial_transactions
set paid_at = coalesce(paid_at, updated_at, created_at)
where status = 'paid' and paid_at is null;

alter table public.financial_transactions
  drop constraint if exists financial_transactions_paid_requires_paid_at;
alter table public.financial_transactions
  add constraint financial_transactions_paid_requires_paid_at
  check (status <> 'paid' or paid_at is not null);

-- Transição NOVA de receita para "paid" exige forma de pagamento. Linhas
-- históricas já pagas sem forma continuam válidas (aparecem como
-- "Não informado"); esta regra só bloqueia dinheiro novo sem método.
create or replace function public.enforce_income_payment_method()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.type = 'income'
     and new.status = 'paid'
     and new.payment_method is null
     and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    raise exception 'PAYMENT_METHOD_REQUIRED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_income_payment_method()
  from public, anon, authenticated;

drop trigger if exists trg_enforce_income_payment_method
  on public.financial_transactions;
create trigger trg_enforce_income_payment_method
before insert or update of status on public.financial_transactions
for each row
execute function public.enforce_income_payment_method();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Venda de produto: receita nasce pendente, salvo captura explícita do
--    pagamento na mesma operação (transacional com a baixa de estoque).
drop function if exists public.confirm_product_sale(uuid);
drop function if exists public.confirm_product_sale(uuid, public.payment_method);
create function public.confirm_product_sale(
  p_appointment_product_id uuid,
  p_payment_method public.payment_method default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_stock numeric;
begin
  select ap.id, ap.barbershop_id, ap.product_id, ap.quantity, ap.unit_price,
         ap.status, ap.appointment_id, a.professional_id, pd.name as product_name
  into r
  from public.appointment_products ap
  join public.appointments a on a.id = ap.appointment_id
  join public.products pd on pd.id = ap.product_id
  where ap.id = p_appointment_product_id;

  if not found then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not (
    public.has_barbershop_role(
      r.barbershop_id,
      array['owner', 'manager', 'receptionist']::public.membership_role[]
    )
    or public.is_own_professional(r.professional_id)
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if r.status = 'confirmed' then
    return; -- idempotente: repetir a ação não duplica estoque nem receita.
  end if;
  if r.status = 'canceled' then
    raise exception 'RESERVATION_CANCELED' using errcode = 'P0001';
  end if;

  -- Serializa confirmações do mesmo produto e valida o saldo do ledger
  -- (regra da migration 0016, preservada aqui: sem saldo não há venda).
  perform 1 from public.products where id = r.product_id for update;
  select coalesce(sum(
    case when type in ('purchase', 'adjustment_in', 'return')
      then quantity else -quantity end
  ), 0)
  into v_stock
  from public.inventory_movements
  where product_id = r.product_id and barbershop_id = r.barbershop_id;

  if v_stock < r.quantity then
    raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
  end if;

  update public.appointment_products
  set status = 'confirmed', confirmed_at = now(),
      confirmed_by = public.current_profile_id()
  where id = p_appointment_product_id;

  insert into public.inventory_movements
    (barbershop_id, product_id, type, quantity, reason, created_by)
  values
    (r.barbershop_id, r.product_id, 'sale', r.quantity,
     'Venda confirmada', public.current_profile_id());

  insert into public.financial_transactions
    (barbershop_id, type, status, category, description, amount, paid_at,
     payment_method, appointment_id, created_by)
  values
    (r.barbershop_id, 'income',
     case when p_payment_method is null then 'pending' else 'paid' end::public.financial_status,
     'product',
     'Venda — ' || coalesce(r.product_name, 'Produto'),
     r.quantity * r.unit_price,
     case when p_payment_method is null then null else now() end,
     p_payment_method,
     r.appointment_id,
     public.current_profile_id());
end;
$$;
revoke all on function public.confirm_product_sale(uuid, public.payment_method)
  from public, anon;
grant execute on function public.confirm_product_sale(uuid, public.payment_method)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Cancelamento sempre carimba canceled_at (o painel não enviava o campo e
--    o update violava a constraint de consistência, falhando em silêncio).
create or replace function public.set_appointment_cancellation_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'canceled' and new.canceled_at is null then
    new.canceled_at := now();
  end if;
  if new.status <> 'canceled' then
    new.canceled_at := null;
    new.cancellation_reason := null;
  end if;
  return new;
end;
$$;
revoke all on function public.set_appointment_cancellation_fields()
  from public, anon, authenticated;

drop trigger if exists trg_set_appointment_cancellation_fields
  on public.appointments;
create trigger trg_set_appointment_cancellation_fields
before insert or update of status on public.appointments
for each row
execute function public.set_appointment_cancellation_fields();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Referência pública da reserva: código curto, sem expor UUID interno.
alter table public.appointments
  add column if not exists public_reference text;

-- Alfabeto sem ambiguidade (sem 0/O/1/I/L) para ditar por telefone.
create or replace function public.generate_booking_reference()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..6 loop
    result := result || substr(alphabet, 1 + floor(random() * 31)::integer, 1);
  end loop;
  return result;
end;
$$;
revoke all on function public.generate_booking_reference()
  from public, anon, authenticated;

create or replace function public.set_appointment_public_reference()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  attempts integer := 0;
begin
  if new.public_reference is not null then
    return new;
  end if;
  loop
    new.public_reference := public.generate_booking_reference();
    exit when not exists (
      select 1 from public.appointments a
      where a.barbershop_id = new.barbershop_id
        and a.public_reference = new.public_reference
    );
    attempts := attempts + 1;
    if attempts >= 5 then
      -- Espaço de 31^6 ≈ 887 milhões por tenant: colisão repetida é
      -- estatisticamente impossível; um sufixo resolve o caso extremo.
      new.public_reference := new.public_reference ||
        substr(public.generate_booking_reference(), 1, 2);
      exit;
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.set_appointment_public_reference()
  from public, anon, authenticated;

drop trigger if exists trg_set_appointment_public_reference
  on public.appointments;
create trigger trg_set_appointment_public_reference
before insert on public.appointments
for each row
execute function public.set_appointment_public_reference();

-- Backfill dos agendamentos existentes.
update public.appointments
set public_reference = public.generate_booking_reference()
where public_reference is null;

-- Desambiguação de eventuais colisões do backfill (conjunto pequeno).
do $$
declare
  dup record;
begin
  for dup in
    select a.id
    from public.appointments a
    join (
      select barbershop_id, public_reference
      from public.appointments
      group by barbershop_id, public_reference
      having count(*) > 1
    ) d using (barbershop_id, public_reference)
  loop
    update public.appointments
    set public_reference = public.generate_booking_reference()
    where id = dup.id;
  end loop;
end;
$$;

alter table public.appointments
  alter column public_reference set not null;

create unique index if not exists appointments_public_reference_key
  on public.appointments (barbershop_id, public_reference);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Público do serviço: quem pode vê-lo e agendá-lo.
--    public   → página e agendamento públicos;
--    members  → exclusivo de assinantes/planos (não aparece ao público geral
--               enquanto planos de clientes não existem);
--    internal → apenas lançamento manual pelo balcão.
--    "Oculto" continua sendo public_visible = false.
alter table public.services
  add column if not exists audience text not null default 'public'
    check (audience in ('public', 'members', 'internal'));

comment on column public.services.audience is
  'Regra de público do serviço: public (página e agendamento), members (assinantes identificados), internal (somente balcão).';

-- get_public_barbershop: filtra serviços por audience = public.
create or replace function public.get_public_barbershop(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'barbershop', jsonb_build_object(
      'id', b.id, 'name', b.name, 'slug', b.slug,
      'logoUrl', b.logo_url, 'timezone', b.timezone, 'plan', b.plan,
      'vertical', b.vertical
    ),
    'settings', jsonb_build_object(
      'primaryColor', s.primary_color,
      'secondaryColor', s.secondary_color,
      'backgroundColor', s.background_color,
      'backgroundType', coalesce(s.background_type, 'color'),
      'backgroundImageUrl', s.background_image_url,
      'fontFamily', s.font_family,
      'heroTitle', s.hero_title,
      'heroSubtitle', s.hero_subtitle,
      'bannerUrl', s.banner_url,
      'whatsappNumber', s.whatsapp_number,
      'instagramUrl', s.instagram_url,
      'address', s.address,
      'openingHours', s.opening_hours
    ),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', sv.id, 'name', sv.name, 'description', sv.description,
        'price', sv.price, 'durationMinutes', sv.duration_minutes,
        'imageUrl', sv.image_url
      ) order by sv.name)
      from public.services sv
      where sv.barbershop_id = b.id and sv.active and sv.public_visible
        and sv.audience = 'public'
    ), '[]'::jsonb),
    'professionals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pr.id, 'name', pr.name, 'bio', pr.bio,
        'avatarUrl', pr.avatar_url,
        'serviceIds', coalesce((
          select jsonb_agg(ps.service_id)
          from public.professional_services ps
          where ps.professional_id = pr.id
        ), '[]'::jsonb)
      ) order by pr.name)
      from public.professionals pr
      where pr.barbershop_id = b.id and pr.active and pr.public_visible
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pd.id, 'name', pd.name, 'description', pd.description,
        'price', pd.sale_price, 'imageUrl', pd.image_url
      ) order by pd.name)
      from public.products pd
      where pd.barbershop_id = b.id and pd.active and pd.public_visible
        and b.plan = 'plus'
    ), '[]'::jsonb),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', sec.section_key, 'title', sec.title, 'body', sec.body,
        'imageUrl', sec.image_url, 'ctaLabel', sec.cta_label,
        'ctaUrl', sec.cta_url
      ) order by sec.sort_order)
      from public.public_site_sections sec
      where sec.barbershop_id = b.id and sec.published
    ), '[]'::jsonb)
  )
  from public.barbershops b
  join public.tenant_settings s on s.barbershop_id = b.id
  where b.slug = lower(trim(p_slug)) and b.status in ('trial', 'active')
  limit 1
$$;
grant execute on function public.get_public_barbershop(text) to anon, authenticated;

-- get_public_availability: serviço não-público não expõe horários.
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
  requested_weekday integer;
begin
  select b.id, b.timezone, coalesce(ps.custom_duration_minutes, s.duration_minutes), ts.booking_notice_minutes
  into tenant_id, tenant_timezone, duration_minutes, notice_minutes
  from public.barbershops b
  join public.tenant_settings ts on ts.barbershop_id = b.id
  join public.services s on s.barbershop_id = b.id and s.id = p_service_id
    and s.active and s.public_visible and s.audience = 'public'
  join public.professional_services ps on ps.service_id = s.id and ps.professional_id = p_professional_id
  join public.professionals pr on pr.id = ps.professional_id and pr.barbershop_id = b.id and pr.active and pr.public_visible
  where b.slug = lower(trim(p_slug)) and b.status in ('trial', 'active');

  if tenant_id is null or p_date < (now() at time zone tenant_timezone)::date then
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
        and a.status in ('pending', 'confirmed', 'completed')
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
grant execute on function public.get_public_availability(text, uuid, uuid, date) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Reserva pública: retorna {reference, status} em vez do UUID interno.
--    Retorno muda de uuid → jsonb, então a função é recriada (drop + create).
drop function if exists public.create_public_appointment(
  text, uuid, uuid, timestamptz, text, text, text, text, jsonb);
create function public.create_public_appointment(
  p_slug text,
  p_professional_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_client_name text,
  p_client_phone text,
  p_client_email text default null,
  p_notes text default null,
  p_products jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  tenant_id uuid;
  tenant_plan text;
  tenant_timezone text;
  duration_minutes integer;
  notice_minutes integer;
  local_start timestamp;
  new_ends_at timestamptz;
  normalized_phone text;
  client_id uuid;
  v_appointment_id uuid;
  v_reference text;
  v_status public.appointment_status;
  product_item jsonb;
  product_uuid uuid;
  product_qty integer;
  product_price numeric(12,2);
begin
  if char_length(trim(p_client_name)) not between 2 and 100 then
    raise exception 'INVALID_CLIENT_NAME' using errcode = 'P0001';
  end if;

  normalized_phone := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
  if normalized_phone !~ '^[0-9]{8,15}$' then
    raise exception 'INVALID_PHONE' using errcode = 'P0001';
  end if;

  select b.id, b.plan, b.timezone, coalesce(ps.custom_duration_minutes, s.duration_minutes), ts.booking_notice_minutes
  into tenant_id, tenant_plan, tenant_timezone, duration_minutes, notice_minutes
  from public.barbershops b
  join public.tenant_settings ts on ts.barbershop_id = b.id
  join public.services s on s.barbershop_id = b.id and s.id = p_service_id
    and s.active and s.public_visible and s.audience = 'public'
  join public.professional_services ps on ps.service_id = s.id and ps.professional_id = p_professional_id
  join public.professionals pr on pr.id = ps.professional_id and pr.barbershop_id = b.id and pr.active and pr.public_visible
  where b.slug = lower(trim(p_slug)) and b.status in ('trial', 'active');

  if tenant_id is null then
    raise exception 'BOOKING_CONTEXT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_starts_at < now() + make_interval(mins => notice_minutes) then
    raise exception 'BOOKING_NOTICE_REQUIRED' using errcode = 'P0001';
  end if;

  if (
    select count(*)
    from public.appointments a
    join public.clients c on c.id = a.client_id
    where a.barbershop_id = tenant_id
      and c.phone_normalized = normalized_phone
      and a.status in ('pending', 'confirmed')
      and a.starts_at > now()
  ) >= 3 then
    raise exception 'TOO_MANY_PENDING' using errcode = 'P0001';
  end if;

  new_ends_at := p_starts_at + make_interval(mins => duration_minutes);
  local_start := p_starts_at at time zone tenant_timezone;

  if not exists (
    select 1
    from public.professional_availability av
    where av.barbershop_id = tenant_id
      and av.professional_id = p_professional_id
      and av.weekday = extract(dow from local_start)
      and av.active
      and local_start::time >= av.starts_at
      and (new_ends_at at time zone tenant_timezone)::time <= av.ends_at
      and mod(
        extract(epoch from (local_start::time - av.starts_at))::integer / 60,
        av.slot_interval_minutes
      ) = 0
  ) then
    raise exception 'OUTSIDE_AVAILABILITY' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.schedule_blocks sb
    where sb.barbershop_id = tenant_id
      and sb.professional_id = p_professional_id
      and tstzrange(sb.starts_at, sb.ends_at, '[)') && tstzrange(p_starts_at, new_ends_at, '[)')
  ) then
    raise exception 'SCHEDULE_BLOCKED' using errcode = 'P0001';
  end if;

  insert into public.clients (barbershop_id, name, phone, phone_normalized, email)
  values (
    tenant_id,
    trim(p_client_name),
    trim(p_client_phone),
    normalized_phone,
    nullif(lower(trim(p_client_email)), '')
  )
  on conflict (barbershop_id, phone_normalized)
  do update set
    name = excluded.name,
    email = coalesce(excluded.email, public.clients.email),
    phone = excluded.phone
  returning id into client_id;

  insert into public.appointments (
    barbershop_id,
    client_id,
    professional_id,
    service_id,
    starts_at,
    ends_at,
    status,
    notes,
    source
  )
  values (
    tenant_id,
    client_id,
    p_professional_id,
    p_service_id,
    p_starts_at,
    new_ends_at,
    'pending',
    nullif(trim(p_notes), ''),
    'public'
  )
  returning id, public_reference, status
    into v_appointment_id, v_reference, v_status;

  -- Upsell: só materializa produtos quando o tenant é Plus.
  if tenant_plan = 'plus' and jsonb_typeof(p_products) = 'array' then
    for product_item in select * from jsonb_array_elements(p_products) limit 10
    loop
      begin
        product_uuid := (product_item ->> 'productId')::uuid;
      exception when others then
        continue;
      end;
      product_qty := greatest(1, least(99, coalesce((product_item ->> 'quantity')::integer, 1)));

      select pd.sale_price into product_price
      from public.products pd
      where pd.id = product_uuid
        and pd.barbershop_id = tenant_id
        and pd.active
        and pd.public_visible;

      if product_price is not null then
        insert into public.appointment_products (barbershop_id, appointment_id, product_id, quantity, unit_price)
        values (tenant_id, v_appointment_id, product_uuid, product_qty, product_price)
        on conflict (appointment_id, product_id) do nothing;
      end if;
    end loop;
  end if;

  insert into public.audit_logs (barbershop_id, action, entity_type, entity_id, metadata)
  values (tenant_id, 'appointment.public_created', 'appointment', v_appointment_id, jsonb_build_object('source', 'public'));

  -- Contrato público: status real persistido + referência curta. Nada de
  -- UUID interno nem dados de outros clientes.
  return jsonb_build_object('reference', v_reference, 'status', v_status);
exception
  when exclusion_violation then
    raise exception 'APPOINTMENT_CONFLICT' using errcode = 'P0001';
end;
$$;
grant execute on function public.create_public_appointment(text, uuid, uuid, timestamptz, text, text, text, text, jsonb) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Resumo financeiro no banco (vendido × recebido × a receber), evitando o
--    teto de linhas do PostgREST. security invoker: RLS do chamador se aplica.
create or replace function public.income_summary(
  p_barbershop uuid,
  p_from timestamptz,
  p_to timestamptz
) returns table (sold numeric, received numeric, receivable numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    -- Vendido no período: receitas criadas (conclusões/vendas), pagas ou não.
    coalesce((
      select sum(amount) from public.financial_transactions
      where barbershop_id = p_barbershop and type = 'income'
        and status <> 'canceled'
        and created_at >= p_from and created_at < p_to
    ), 0)::numeric as sold,
    -- Recebido no período: efetivamente pago dentro da janela.
    coalesce((
      select sum(amount) from public.financial_transactions
      where barbershop_id = p_barbershop and type = 'income'
        and status = 'paid'
        and paid_at >= p_from and paid_at < p_to
    ), 0)::numeric as received,
    -- A receber: estoque atual de receitas pendentes (independe da janela).
    coalesce((
      select sum(amount) from public.financial_transactions
      where barbershop_id = p_barbershop and type = 'income'
        and status in ('pending', 'overdue')
    ), 0)::numeric as receivable;
$$;
revoke all on function public.income_summary(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.income_summary(uuid, timestamptz, timestamptz)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Rate limit compartilhado entre instâncias serverless.
--    Janela fixa por chave; consumo atômico via upsert. Executável apenas
--    pelo service_role (o servidor chama com o admin client — a chave nunca
--    fica exposta a anon/authenticated).
create table if not exists public.rate_limit_buckets (
  key text primary key check (char_length(key) <= 200),
  window_started_at timestamptz not null default now(),
  hits integer not null default 0
);
alter table public.rate_limit_buckets enable row level security;
-- Sem policies: nenhum papel de aplicação lê ou escreve diretamente.

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits integer;
begin
  insert into public.rate_limit_buckets as b (key, window_started_at, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case
      when b.window_started_at < now() - make_interval(secs => p_window_seconds)
        then 1
      else b.hits + 1
    end,
    window_started_at = case
      when b.window_started_at < now() - make_interval(secs => p_window_seconds)
        then now()
      else b.window_started_at
    end
  returning hits into v_hits;

  -- Limpeza oportunista: remove chaves paradas há mais de um dia.
  if random() < 0.01 then
    delete from public.rate_limit_buckets
    where window_started_at < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end;
$$;
revoke all on function public.consume_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer)
  to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9b. Higiene de segurança (advisor): sobrecargas antigas de
--     create_barbershop continuavam executáveis por authenticated e pulavam
--     as validações novas (assinatura/trial/vertical). Só a versão de 4
--     argumentos (migration 0019) permanece.
drop function if exists public.create_barbershop(text, text);
drop function if exists public.create_barbershop(text, text, text);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Estorno e cancelamento de receita com auditoria — nunca apagar o
--     histórico financeiro. audit_logs só aceita escrita via definer.
create or replace function public.revert_income_payment(p_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
begin
  select id, barbershop_id, type, status, amount, payment_method
  into t
  from public.financial_transactions
  where id = p_transaction_id;

  if not found or t.type <> 'income' then
    raise exception 'TRANSACTION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not public.has_barbershop_role(
    t.barbershop_id, array['owner']::public.membership_role[]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if t.status <> 'paid' then
    return; -- idempotente: já não está paga.
  end if;

  update public.financial_transactions
  set status = 'pending', paid_at = null, payment_method = null
  where id = p_transaction_id;

  insert into public.audit_logs
    (barbershop_id, actor_profile_id, action, entity_type, entity_id, metadata)
  values
    (t.barbershop_id, public.current_profile_id(), 'payment.reverted',
     'financial_transaction', t.id,
     jsonb_build_object('amount', t.amount, 'previous_method', t.payment_method));
end;
$$;
revoke all on function public.revert_income_payment(uuid) from public, anon;
grant execute on function public.revert_income_payment(uuid) to authenticated;

create or replace function public.cancel_income_transaction(
  p_transaction_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
begin
  select id, barbershop_id, type, status, amount
  into t
  from public.financial_transactions
  where id = p_transaction_id;

  if not found or t.type <> 'income' then
    raise exception 'TRANSACTION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not public.has_barbershop_role(
    t.barbershop_id, array['owner']::public.membership_role[]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if t.status = 'canceled' then
    return; -- idempotente.
  end if;
  if t.status = 'paid' then
    raise exception 'TRANSACTION_ALREADY_PAID' using errcode = 'P0001';
  end if;

  update public.financial_transactions
  set status = 'canceled'
  where id = p_transaction_id;

  insert into public.audit_logs
    (barbershop_id, actor_profile_id, action, entity_type, entity_id, metadata)
  values
    (t.barbershop_id, public.current_profile_id(), 'transaction.canceled',
     'financial_transaction', t.id,
     jsonb_build_object('amount', t.amount, 'reason', p_reason));
end;
$$;
revoke all on function public.cancel_income_transaction(uuid, text)
  from public, anon;
grant execute on function public.cancel_income_transaction(uuid, text)
  to authenticated;

commit;
