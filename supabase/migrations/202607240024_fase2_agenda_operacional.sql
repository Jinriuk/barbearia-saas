-- Fase 2 — Agenda operacional: máquina de estados no banco, remarcação
-- transacional, "primeiro disponível" e autogestão da reserva por token.
--
-- 1) Máquina de estados do atendimento passa a valer no BANCO (não só na
--    interface): pending → confirmed → completed / canceled / no_show.
--    Correções explícitas permitidas: completed→confirmed e
--    no_show→confirmed (desfazer engano). canceled é final. `in_progress`
--    NÃO foi implementado — decisão registrada: o fluxo do balcão vai de
--    confirmado direto a concluído; a coluna pode ganhar o estado depois
--    sem quebrar nada. Conclusão no futuro é bloqueada.
-- 2) reschedule_appointment: remarcação transacional que preserva o
--    histórico (mesma linha + audit_log com horários anteriores); em
--    conflito a exclusion constraint arbitra e nada muda.
-- 3) get_first_available: avalia todos os profissionais habilitados no
--    serviço de uma vez (nada de uma chamada por profissional no browser).
-- 4) appointments.public_token: token público limitado por reserva (não
--    expõe o UUID interno) para o cliente consultar e cancelar; expira
--    junto com o horário. Respeita cancellation_notice_minutes.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Máquina de estados no banco.
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
    (old.status = 'pending' and new.status in ('confirmed', 'canceled'))
    or (old.status = 'confirmed' and new.status in ('completed', 'canceled', 'no_show'))
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

  return new;
end;
$$;
revoke all on function public.enforce_appointment_transition()
  from public, anon, authenticated;

drop trigger if exists trg_enforce_appointment_transition on public.appointments;
create trigger trg_enforce_appointment_transition
before update of status on public.appointments
for each row
execute function public.enforce_appointment_transition();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Token público da reserva (autogestão do cliente sem login).
alter table public.appointments
  add column if not exists public_token text;

create or replace function public.generate_public_token()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz';
  result text := '';
  i integer;
begin
  for i in 1..26 loop
    result := result || substr(alphabet, 1 + floor(random() * 55)::integer, 1);
  end loop;
  return result;
end;
$$;
revoke all on function public.generate_public_token()
  from public, anon, authenticated;

create or replace function public.set_appointment_public_token()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.public_token is null then
    new.public_token := public.generate_public_token();
  end if;
  return new;
end;
$$;
revoke all on function public.set_appointment_public_token()
  from public, anon, authenticated;

drop trigger if exists trg_set_appointment_public_token on public.appointments;
create trigger trg_set_appointment_public_token
before insert on public.appointments
for each row
execute function public.set_appointment_public_token();

update public.appointments
set public_token = public.generate_public_token()
where public_token is null;

alter table public.appointments
  alter column public_token set not null;

create unique index if not exists appointments_public_token_key
  on public.appointments (public_token);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Remarcação transacional (equipe).
create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_starts_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_duration integer;
  v_old_starts timestamptz;
  v_old_ends timestamptz;
  v_new_ends timestamptz;
begin
  select ap.id, ap.barbershop_id, ap.professional_id, ap.service_id,
         ap.status, ap.starts_at, ap.ends_at
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
  if a.status not in ('pending', 'confirmed') then
    raise exception 'INVALID_STATUS_TRANSITION' using errcode = 'P0001';
  end if;
  if p_starts_at < now() then
    raise exception 'INVALID_START' using errcode = 'P0001';
  end if;

  select coalesce(ps.custom_duration_minutes, s.duration_minutes)
  into v_duration
  from public.services s
  left join public.professional_services ps
    on ps.service_id = s.id and ps.professional_id = a.professional_id
  where s.id = a.service_id;

  v_new_ends := p_starts_at + make_interval(mins => coalesce(v_duration, 30));

  if exists (
    select 1 from public.schedule_blocks sb
    where sb.barbershop_id = a.barbershop_id
      and sb.professional_id = a.professional_id
      and tstzrange(sb.starts_at, sb.ends_at, '[)') && tstzrange(p_starts_at, v_new_ends, '[)')
  ) then
    raise exception 'SCHEDULE_BLOCKED' using errcode = 'P0001';
  end if;

  v_old_starts := a.starts_at;
  v_old_ends := a.ends_at;

  -- Mesma linha (histórico preservado); a exclusion constraint arbitra
  -- corrida — em conflito nada muda e o horário anterior fica de pé.
  update public.appointments
  set starts_at = p_starts_at, ends_at = v_new_ends
  where id = p_appointment_id;

  insert into public.audit_logs
    (barbershop_id, actor_profile_id, action, entity_type, entity_id, metadata)
  values
    (a.barbershop_id, public.current_profile_id(), 'appointment.rescheduled',
     'appointment', a.id,
     jsonb_build_object(
       'from', jsonb_build_object('startsAt', v_old_starts, 'endsAt', v_old_ends),
       'to', jsonb_build_object('startsAt', p_starts_at, 'endsAt', v_new_ends)
     ));

  return jsonb_build_object('startsAt', p_starts_at, 'endsAt', v_new_ends);
exception
  when exclusion_violation then
    raise exception 'APPOINTMENT_CONFLICT' using errcode = 'P0001';
end;
$$;
revoke all on function public.reschedule_appointment(uuid, timestamptz)
  from public, anon;
grant execute on function public.reschedule_appointment(uuid, timestamptz)
  to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Primeiro disponível: um único round-trip avalia todos os profissionais
--    habilitados no serviço e devolve as opções ordenadas por horário.
create or replace function public.get_first_available(
  p_slug text,
  p_service_id uuid,
  p_date date
)
returns table (
  starts_at timestamptz,
  ends_at timestamptz,
  professional_id uuid,
  professional_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
  select av.starts_at, av.ends_at, p.id, p.name
  from public.barbershops b
  join public.professionals p on p.barbershop_id = b.id
    and p.active and p.public_visible
  join public.professional_services ps on ps.professional_id = p.id
    and ps.service_id = p_service_id
  cross join lateral public.get_public_availability(
    p_slug, p.id, p_service_id, p_date
  ) av
  where b.slug = lower(trim(p_slug)) and b.status in ('trial', 'active')
  order by av.starts_at, p.name
  limit 200;
end;
$$;
revoke all on function public.get_first_available(text, uuid, date) from public;
grant execute on function public.get_first_available(text, uuid, date)
  to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Autogestão pública da reserva por token.
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
    'serviceName', s.name,
    'servicePrice', s.price,
    'professionalName', pr.name,
    'shopName', b.name,
    'shopSlug', b.slug,
    'timezone', b.timezone,
    'whatsappNumber', ts.whatsapp_number,
    'cancellationNoticeMinutes', ts.cancellation_notice_minutes,
    'canCancel', (
      a.status in ('pending', 'confirmed')
      and a.starts_at > now() + make_interval(mins => ts.cancellation_notice_minutes)
    )
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

create or replace function public.cancel_public_appointment(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_notice integer;
begin
  select ap.id, ap.barbershop_id, ap.status, ap.starts_at
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

  select ts.cancellation_notice_minutes into v_notice
  from public.tenant_settings ts
  where ts.barbershop_id = a.barbershop_id;

  if a.starts_at <= now() + make_interval(mins => coalesce(v_notice, 0)) then
    raise exception 'CANCELLATION_NOTICE_REQUIRED' using errcode = 'P0001';
  end if;

  update public.appointments
  set status = 'canceled',
      cancellation_reason = 'Cancelado pelo cliente'
  where id = a.id;

  insert into public.audit_logs (barbershop_id, action, entity_type, entity_id, metadata)
  values (a.barbershop_id, 'appointment.public_canceled', 'appointment', a.id,
          jsonb_build_object('source', 'public_token'));

  return jsonb_build_object('status', 'canceled');
end;
$$;
revoke all on function public.cancel_public_appointment(text) from public;
grant execute on function public.cancel_public_appointment(text)
  to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. A reserva pública passa a devolver também o token de autogestão.
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
  v_token text;
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

  return jsonb_build_object(
    'reference', v_reference,
    'status', v_status,
    'token', v_token
  );
exception
  when exclusion_violation then
    raise exception 'APPOINTMENT_CONFLICT' using errcode = 'P0001';
end;
$$;
grant execute on function public.create_public_appointment(text, uuid, uuid, timestamptz, text, text, text, text, jsonb) to anon, authenticated;

commit;
