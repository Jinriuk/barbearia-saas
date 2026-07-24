-- Fase 1 — Regras de agendamento configuráveis e expediente editável.
--
-- 1) tenant_settings ganha: horizonte máximo de agendamento, modo de
--    confirmação (manual/auto) e limite de pendentes por cliente. As RPCs
--    públicas passam a respeitar os três; no modo auto a reserva já nasce
--    'confirmed' e a página pública reflete o modo configurado.
-- 2) set_professional_availability: substituição transacional do expediente
--    semanal de um profissional, com validação de janelas (fim > início,
--    sem sobreposição no mesmo dia, intervalo 5–120 min). Turnos que cruzam
--    a meia-noite NÃO são permitidos (decisão registrada em docs/05).
--    Alterar expediente nunca cancela horários existentes — a função apenas
--    avisa quantos agendamentos futuros ficaram fora das novas janelas.
--
-- Rollback: dropar as colunas novas exige recriar as RPCs antigas (0022);
-- alternativa segura é manter as colunas com os defaults (comportamento
-- idêntico ao anterior) e remover apenas a UI.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Regras de agendamento por barbearia.
alter table public.tenant_settings
  add column if not exists booking_horizon_days integer not null default 60
    check (booking_horizon_days between 1 and 365),
  add column if not exists booking_confirmation_mode text not null default 'manual'
    check (booking_confirmation_mode in ('manual', 'auto')),
  add column if not exists max_pending_per_client integer not null default 3
    check (max_pending_per_client between 1 and 10);

comment on column public.tenant_settings.booking_horizon_days is
  'Quantos dias no futuro a página pública aceita reservas.';
comment on column public.tenant_settings.booking_confirmation_mode is
  'manual: reserva nasce pending e a equipe confirma; auto: nasce confirmed.';
comment on column public.tenant_settings.max_pending_per_client is
  'Máximo de reservas futuras em aberto por telefone no tenant.';

-- Página pública precisa saber o modo para nunca prometer o que não faz.
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

-- Disponibilidade pública respeita o horizonte configurado.
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

-- Reserva pública: horizonte + limite de pendentes configuráveis + modo de
-- confirmação. No modo auto a reserva nasce 'confirmed' e o retorno
-- {reference, status} continua refletindo o status realmente persistido.
create or replace function public.create_public_appointment(
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
  horizon_days integer;
  confirmation_mode text;
  pending_limit integer;
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

  select b.id, b.plan, b.timezone, coalesce(ps.custom_duration_minutes, s.duration_minutes),
         ts.booking_notice_minutes, ts.booking_horizon_days,
         ts.booking_confirmation_mode, ts.max_pending_per_client
  into tenant_id, tenant_plan, tenant_timezone, duration_minutes,
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
    source
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

  return jsonb_build_object('reference', v_reference, 'status', v_status);
exception
  when exclusion_violation then
    raise exception 'APPOINTMENT_CONFLICT' using errcode = 'P0001';
end;
$$;
grant execute on function public.create_public_appointment(text, uuid, uuid, timestamptz, text, text, text, text, jsonb) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Expediente semanal transacional.
--    p_rules: [{"weekday":1,"startsAt":"09:00","endsAt":"12:00","slotIntervalMinutes":15}, ...]
--    Substitui o conjunto inteiro do profissional. Dia sem regra = fechado.
--    Retorna jsonb com o total de agendamentos futuros (pending/confirmed)
--    que ficaram fora das novas janelas — aviso, nunca cancelamento.
create or replace function public.set_professional_availability(
  p_professional_id uuid,
  p_rules jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_barbershop_id uuid;
  v_allow_self boolean;
  v_rule jsonb;
  v_weekday integer;
  v_starts time;
  v_ends time;
  v_interval integer;
  v_count integer := 0;
  v_orphans integer := 0;
begin
  select p.barbershop_id, p.allow_self_blocks
  into v_barbershop_id, v_allow_self
  from public.professionals p
  where p.id = p_professional_id;

  if v_barbershop_id is null then
    raise exception 'PROFESSIONAL_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not (
    public.has_barbershop_role(
      v_barbershop_id, array['owner', 'manager']::public.membership_role[]
    )
    or public.is_own_professional(p_professional_id)
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_rules) <> 'array' or jsonb_array_length(p_rules) > 40 then
    raise exception 'INVALID_RULES' using errcode = 'P0001';
  end if;

  -- Validação campo a campo + sobreposição dentro do mesmo dia.
  for v_rule in select * from jsonb_array_elements(p_rules)
  loop
    v_weekday := (v_rule ->> 'weekday')::integer;
    v_starts := (v_rule ->> 'startsAt')::time;
    v_ends := (v_rule ->> 'endsAt')::time;
    v_interval := coalesce((v_rule ->> 'slotIntervalMinutes')::integer, 15);

    if v_weekday is null or v_weekday not between 0 and 6 then
      raise exception 'INVALID_WEEKDAY' using errcode = 'P0001';
    end if;
    -- Turno que cruza a meia-noite não é suportado (fim > início no mesmo dia).
    if v_starts is null or v_ends is null or v_ends <= v_starts then
      raise exception 'INVALID_WINDOW' using errcode = 'P0001';
    end if;
    if v_interval not between 5 and 120 then
      raise exception 'INVALID_INTERVAL' using errcode = 'P0001';
    end if;

    v_count := v_count + 1;
  end loop;

  -- Sobreposição (ou duplicata) dentro do mesmo dia: compara cada par uma vez
  -- pela posição no array.
  if exists (
    select 1
    from jsonb_array_elements(p_rules) with ordinality a(item, i)
    join jsonb_array_elements(p_rules) with ordinality b(item, j) on a.i < b.j
    where (a.item ->> 'weekday')::integer = (b.item ->> 'weekday')::integer
      and (a.item ->> 'startsAt')::time < (b.item ->> 'endsAt')::time
      and (b.item ->> 'startsAt')::time < (a.item ->> 'endsAt')::time
  ) then
    raise exception 'OVERLAPPING_WINDOWS' using errcode = 'P0001';
  end if;

  delete from public.professional_availability
  where professional_id = p_professional_id
    and barbershop_id = v_barbershop_id;

  insert into public.professional_availability
    (barbershop_id, professional_id, weekday, starts_at, ends_at,
     slot_interval_minutes, active)
  select
    v_barbershop_id,
    p_professional_id,
    (r.item ->> 'weekday')::integer,
    (r.item ->> 'startsAt')::time,
    (r.item ->> 'endsAt')::time,
    coalesce((r.item ->> 'slotIntervalMinutes')::integer, 15),
    true
  from jsonb_array_elements(p_rules) r(item);

  -- Aviso: agendamentos futuros que ficaram fora das novas janelas
  -- (nada é cancelado — a equipe decide caso a caso).
  select count(*) into v_orphans
  from public.appointments a
  join public.barbershops b on b.id = a.barbershop_id
  where a.barbershop_id = v_barbershop_id
    and a.professional_id = p_professional_id
    and a.status in ('pending', 'confirmed')
    and a.starts_at > now()
    and not exists (
      select 1 from public.professional_availability av
      where av.professional_id = a.professional_id
        and av.barbershop_id = a.barbershop_id
        and av.active
        and av.weekday = extract(dow from (a.starts_at at time zone b.timezone))
        and (a.starts_at at time zone b.timezone)::time >= av.starts_at
        and (a.ends_at at time zone b.timezone)::time <= av.ends_at
    );

  insert into public.audit_logs
    (barbershop_id, actor_profile_id, action, entity_type, entity_id, metadata)
  values
    (v_barbershop_id, public.current_profile_id(), 'availability.updated',
     'professional', p_professional_id,
     jsonb_build_object('rules', v_count, 'future_outside', v_orphans));

  return jsonb_build_object('rules', v_count, 'futureOutside', v_orphans);
end;
$$;
revoke all on function public.set_professional_availability(uuid, jsonb)
  from public, anon;
grant execute on function public.set_professional_availability(uuid, jsonb)
  to authenticated;

commit;
