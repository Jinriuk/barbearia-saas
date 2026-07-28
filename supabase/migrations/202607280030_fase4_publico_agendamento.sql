-- Fase 4 (plano docs/14-plano-de-fases.md) — Página pública e agendamento.
--
-- O que muda no banco, e por quê:
--
-- 1) product_available_stock: saldo público do produto = ledger de
--    movimentações − reservas ainda pendentes. Devolve NULL quando o produto
--    NUNCA teve movimentação — barbearia que não usa o módulo de estoque não
--    pode ter a vitrine inteira marcada como "Indisponível" (regressão que
--    um saldo 0 causaria). NULL = "estoque não controlado", número = verdade.
-- 2) get_public_barbershop passa a expor esse saldo em cada produto, para a
--    página e o passo de upsell marcarem "Indisponível" (§7.10).
-- 3) appointments.payment_preference: a etapa 6 do §7.11 existe, mas não há
--    gateway (Fase 5). O que se pergunta ao cliente é COMO ele pretende pagar
--    NO LOCAL — a forma de pagamento real continua sendo gravada no
--    financeiro, na conclusão do atendimento. Nomes diferentes de propósito:
--    preferência declarada ≠ pagamento recebido.
-- 4) create_public_appointment ganha a preferência de pagamento, TRAVA de
--    estoque no upsell (hoje dá para reservar produto esgotado) e passa a
--    devolver o registro como ele ficou gravado — a tela final do cliente
--    deixa de ser montada com o que o navegador lembrava (§7.11).
-- 5) get_public_client_hint: reconhecimento de cliente recorrente pelo
--    telefone. Devolve SÓ o primeiro nome; nada de e-mail, histórico ou id.
--    O limite de tentativas fica na rota (não dá para varrer a base).
-- 6) reschedule_public_appointment: remarcar sem falar com ninguém, pelo
--    token da reserva. Reaproveita todas as regras da criação (antecedência,
--    horizonte, expediente, bloqueios) e o mesmo prazo do cancelamento —
--    quem não pode mais cancelar também não pode mais remarcar sozinho.
-- 7) get_public_appointment devolve pagamento, produtos e total, para a
--    página do token ter a mesma completude da tela final.
--
-- Rollback: as funções voltam à versão da migration 202607240024; a coluna
-- payment_preference pode ficar (nullable, sem trigger) sem efeito algum.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Saldo público do produto (ledger − reservas pendentes).
create or replace function public.product_available_stock(
  p_barbershop_id uuid,
  p_product_id uuid
)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
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
          and a.status in ('pending', 'confirmed')
      ), 0)
  end
$$;
revoke all on function public.product_available_stock(uuid, uuid) from public;
grant execute on function public.product_available_stock(uuid, uuid)
  to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Preferência de pagamento declarada pelo cliente (etapa 6 do §7.11).
alter table public.appointments
  add column if not exists payment_preference public.payment_method;

comment on column public.appointments.payment_preference is
  'Como o cliente disse que pretende pagar NO LOCAL. Não é recebimento: o pagamento real vive em financial_transactions.payment_method.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Vitrine pública com saldo de estoque.
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
      'openingHours', s.opening_hours,
      'bookingConfirmationMode', s.booking_confirmation_mode
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
        'price', pd.sale_price, 'imageUrl', pd.image_url,
        -- null = produto sem controle de estoque; número = saldo real.
        'stock', public.product_available_stock(pd.barbershop_id, pd.id)
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
grant execute on function public.get_public_barbershop(text)
  to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Reconhecimento do cliente recorrente pelo telefone (§7.11, etapa 4).
--    Superfície mínima de propósito: só o primeiro nome. Sem e-mail, sem
--    histórico, sem id — e a rota que chama tem limite por IP.
create or replace function public.get_public_client_hint(
  p_slug text,
  p_phone text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'found', true,
    'firstName', split_part(trim(c.name), ' ', 1)
  )
  from public.clients c
  join public.barbershops b on b.id = c.barbershop_id
  where b.slug = lower(trim(p_slug))
    and b.status in ('trial', 'active')
    and c.phone_normalized = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
    -- Número curto demais reconheceria "qualquer um": exige nacional completo.
    and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) between 10 and 15
  limit 1
$$;
revoke all on function public.get_public_client_hint(text, text) from public;
grant execute on function public.get_public_client_hint(text, text)
  to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Reserva pública: pagamento declarado, trava de estoque e retorno com o
--    que ficou realmente gravado.
drop function if exists public.create_public_appointment(
  text, uuid, uuid, timestamptz, text, text, text, text, jsonb
);

create or replace function public.create_public_appointment(
  p_slug text,
  p_professional_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_client_name text,
  p_client_phone text,
  p_client_email text default null,
  p_notes text default null,
  p_products jsonb default '[]'::jsonb,
  p_payment_preference text default null
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
  service_name text;
  service_price numeric(12,2);
  professional_name text;
  duration_minutes integer;
  notice_minutes integer;
  horizon_days integer;
  confirmation_mode text;
  pending_limit integer;
  local_start timestamp;
  new_ends_at timestamptz;
  normalized_phone text;
  client_id uuid;
  v_appointment_id uuid;
  v_reference text;
  v_token text;
  v_status public.appointment_status;
  v_preference public.payment_method;
  product_item jsonb;
  product_uuid uuid;
  product_qty integer;
  product_price numeric(12,2);
  product_name text;
  product_stock numeric;
begin
  if char_length(trim(p_client_name)) not between 2 and 100 then
    raise exception 'INVALID_CLIENT_NAME' using errcode = 'P0001';
  end if;

  normalized_phone := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
  if normalized_phone !~ '^[0-9]{8,15}$' then
    raise exception 'INVALID_PHONE' using errcode = 'P0001';
  end if;

  -- Preferência inválida nunca derruba a reserva: vira "decide na hora".
  if p_payment_preference in ('cash', 'card', 'pix', 'other') then
    v_preference := p_payment_preference::public.payment_method;
  else
    v_preference := null;
  end if;

  select b.id, b.plan, b.timezone, s.name, s.price, pr.name,
         coalesce(ps.custom_duration_minutes, s.duration_minutes),
         ts.booking_notice_minutes, ts.booking_horizon_days,
         ts.booking_confirmation_mode, ts.max_pending_per_client
  into tenant_id, tenant_plan, tenant_timezone, service_name, service_price,
       professional_name, duration_minutes,
       notice_minutes, horizon_days, confirmation_mode, pending_limit
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
  if (p_starts_at at time zone tenant_timezone)::date >
     (now() at time zone tenant_timezone)::date + coalesce(horizon_days, 60) then
    raise exception 'BOOKING_HORIZON_EXCEEDED' using errcode = 'P0001';
  end if;

  if (
    select count(*)
    from public.appointments a
    join public.clients c on c.id = a.client_id
    where a.barbershop_id = tenant_id
      and c.phone_normalized = normalized_phone
      and a.status in ('pending', 'confirmed')
      and a.starts_at > now()
  ) >= coalesce(pending_limit, 3) then
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
    source,
    payment_preference
  )
  values (
    tenant_id,
    client_id,
    p_professional_id,
    p_service_id,
    p_starts_at,
    new_ends_at,
    case when confirmation_mode = 'auto'
      then 'confirmed'::public.appointment_status
      else 'pending'::public.appointment_status
    end,
    nullif(trim(p_notes), ''),
    'public',
    v_preference
  )
  returning id, public_reference, public_token, status
    into v_appointment_id, v_reference, v_token, v_status;

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

      select pd.sale_price, pd.name into product_price, product_name
      from public.products pd
      where pd.id = product_uuid
        and pd.barbershop_id = tenant_id
        and pd.active
        and pd.public_visible;

      if product_price is not null then
        -- Trava de estoque no público (§7.10): produto controlado e sem
        -- saldo não pode ser reservado. Sem movimentação = não controlado.
        product_stock := public.product_available_stock(tenant_id, product_uuid);
        if product_stock is not null and product_stock < product_qty then
          raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'P0001';
        end if;

        insert into public.appointment_products (barbershop_id, appointment_id, product_id, quantity, unit_price)
        values (tenant_id, v_appointment_id, product_uuid, product_qty, product_price)
        on conflict (appointment_id, product_id) do nothing;
      end if;
    end loop;
  end if;

  insert into public.audit_logs (barbershop_id, action, entity_type, entity_id, metadata)
  values (tenant_id, 'appointment.public_created', 'appointment', v_appointment_id, jsonb_build_object('source', 'public'));

  -- Contrato da tela final: tudo relido do que ficou gravado, nunca do que
  -- o navegador lembrava. Continua sem expor nenhum UUID interno.
  return jsonb_build_object(
    'reference', v_reference,
    'status', v_status,
    'token', v_token,
    'startsAt', p_starts_at,
    'endsAt', new_ends_at,
    'serviceName', service_name,
    'servicePrice', service_price,
    'professionalName', professional_name,
    'paymentPreference', v_preference,
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', pd.name,
        'quantity', ap.quantity,
        'unitPrice', ap.unit_price
      ) order by pd.name)
      from public.appointment_products ap
      join public.products pd on pd.id = ap.product_id
      where ap.appointment_id = v_appointment_id
    ), '[]'::jsonb),
    'total', coalesce(service_price, 0) + coalesce((
      select sum(ap.quantity * ap.unit_price)
      from public.appointment_products ap
      where ap.appointment_id = v_appointment_id
    ), 0)
  );
exception
  when exclusion_violation then
    raise exception 'APPOINTMENT_CONFLICT' using errcode = 'P0001';
end;
$$;
grant execute on function public.create_public_appointment(
  text, uuid, uuid, timestamptz, text, text, text, text, jsonb, text
) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Página do token com a mesma completude da tela final.
create or replace function public.get_public_appointment(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'reference', a.public_reference,
    'status', a.status,
    'startsAt', a.starts_at,
    'endsAt', a.ends_at,
    'serviceId', a.service_id,
    'serviceName', s.name,
    'servicePrice', s.price,
    'professionalId', a.professional_id,
    'professionalName', pr.name,
    'paymentPreference', a.payment_preference,
    'shopName', b.name,
    'shopSlug', b.slug,
    'timezone', b.timezone,
    'whatsappNumber', ts.whatsapp_number,
    'cancellationNoticeMinutes', ts.cancellation_notice_minutes,
    'canCancel', (
      a.status in ('pending', 'confirmed')
      and a.starts_at > now() + make_interval(mins => ts.cancellation_notice_minutes)
    ),
    -- Remarcar segue o MESMO prazo do cancelamento: quem não pode mais
    -- desmarcar sozinho também não move o horário sozinho.
    'canReschedule', (
      a.status in ('pending', 'confirmed')
      and a.starts_at > now() + make_interval(mins => ts.cancellation_notice_minutes)
    ),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', pd.name,
        'quantity', ap.quantity,
        'unitPrice', ap.unit_price
      ) order by pd.name)
      from public.appointment_products ap
      join public.products pd on pd.id = ap.product_id
      where ap.appointment_id = a.id and ap.status <> 'canceled'
    ), '[]'::jsonb),
    'total', coalesce(s.price, 0) + coalesce((
      select sum(ap.quantity * ap.unit_price)
      from public.appointment_products ap
      where ap.appointment_id = a.id and ap.status <> 'canceled'
    ), 0)
  )
  from public.appointments a
  join public.barbershops b on b.id = a.barbershop_id
  join public.tenant_settings ts on ts.barbershop_id = b.id
  left join public.services s on s.id = a.service_id
  left join public.professionals pr on pr.id = a.professional_id
  where a.public_token = p_token
    -- token expira junto com o dia do horário (não é chave eterna)
    and a.ends_at > now() - interval '1 day'
  limit 1
$$;
revoke all on function public.get_public_appointment(text) from public;
grant execute on function public.get_public_appointment(text)
  to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Remarcação pelo próprio cliente (§7.11 / pilar G1: menos mensagens).
--    Mesmas regras da criação — o horário novo passa por antecedência,
--    horizonte, expediente e bloqueios. Serviço e profissional não mudam:
--    trocar de profissional é uma reserva nova, não uma remarcação.
create or replace function public.reschedule_public_appointment(
  p_token text,
  p_starts_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a record;
  tenant_timezone text;
  notice_minutes integer;
  cancel_notice integer;
  horizon_days integer;
  duration_minutes integer;
  local_start timestamp;
  new_ends_at timestamptz;
  v_old_starts timestamptz;
  v_old_ends timestamptz;
begin
  select ap.id, ap.barbershop_id, ap.professional_id, ap.service_id,
         ap.status, ap.starts_at, ap.ends_at
  into a
  from public.appointments ap
  where ap.public_token = p_token
    and ap.ends_at > now() - interval '1 day';

  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if a.status not in ('pending', 'confirmed') then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  select b.timezone, ts.booking_notice_minutes,
         ts.cancellation_notice_minutes, ts.booking_horizon_days
  into tenant_timezone, notice_minutes, cancel_notice, horizon_days
  from public.barbershops b
  join public.tenant_settings ts on ts.barbershop_id = b.id
  where b.id = a.barbershop_id;

  -- Prazo para MEXER na reserva atual (o mesmo do cancelamento).
  if a.starts_at <= now() + make_interval(mins => coalesce(cancel_notice, 0)) then
    raise exception 'CANCELLATION_NOTICE_REQUIRED' using errcode = 'P0001';
  end if;
  -- Antecedência mínima do horário NOVO.
  if p_starts_at < now() + make_interval(mins => coalesce(notice_minutes, 0)) then
    raise exception 'BOOKING_NOTICE_REQUIRED' using errcode = 'P0001';
  end if;
  if (p_starts_at at time zone tenant_timezone)::date >
     (now() at time zone tenant_timezone)::date + coalesce(horizon_days, 60) then
    raise exception 'BOOKING_HORIZON_EXCEEDED' using errcode = 'P0001';
  end if;

  select coalesce(ps.custom_duration_minutes, s.duration_minutes)
  into duration_minutes
  from public.services s
  left join public.professional_services ps
    on ps.service_id = s.id and ps.professional_id = a.professional_id
  where s.id = a.service_id;

  new_ends_at := p_starts_at + make_interval(mins => coalesce(duration_minutes, 30));
  local_start := p_starts_at at time zone tenant_timezone;

  if not exists (
    select 1
    from public.professional_availability av
    where av.barbershop_id = a.barbershop_id
      and av.professional_id = a.professional_id
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
    where sb.barbershop_id = a.barbershop_id
      and sb.professional_id = a.professional_id
      and tstzrange(sb.starts_at, sb.ends_at, '[)') && tstzrange(p_starts_at, new_ends_at, '[)')
  ) then
    raise exception 'SCHEDULE_BLOCKED' using errcode = 'P0001';
  end if;

  v_old_starts := a.starts_at;
  v_old_ends := a.ends_at;

  -- Mesma linha (histórico preservado); a exclusion constraint arbitra a
  -- corrida — em conflito nada muda e o horário anterior fica de pé.
  update public.appointments
  set starts_at = p_starts_at, ends_at = new_ends_at
  where id = a.id;

  insert into public.audit_logs
    (barbershop_id, action, entity_type, entity_id, metadata)
  values
    (a.barbershop_id, 'appointment.public_rescheduled', 'appointment', a.id,
     jsonb_build_object(
       'source', 'public_token',
       'from', jsonb_build_object('startsAt', v_old_starts, 'endsAt', v_old_ends),
       'to', jsonb_build_object('startsAt', p_starts_at, 'endsAt', new_ends_at)
     ));

  return jsonb_build_object('startsAt', p_starts_at, 'endsAt', new_ends_at);
exception
  when exclusion_violation then
    raise exception 'APPOINTMENT_CONFLICT' using errcode = 'P0001';
end;
$$;
revoke all on function public.reschedule_public_appointment(text, timestamptz)
  from public;
grant execute on function public.reschedule_public_appointment(text, timestamptz)
  to anon, authenticated;

commit;
