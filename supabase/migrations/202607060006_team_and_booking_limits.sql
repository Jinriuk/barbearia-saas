begin;

-- =========================================================================
-- Equipe: perfis visíveis entre colegas do mesmo tenant + convite por e-mail.
-- Anti-abuso: limite de reservas públicas ativas por telefone.
-- =========================================================================

-- A tela Equipe precisa listar nomes dos membros; a política original só
-- permitia ver o próprio perfil. is_barbershop_member é security definer,
-- então não há recursão de RLS aqui.
create policy "members can view colleague profiles"
on public.profiles for select to authenticated
using (
  exists (
    select 1
    from public.memberships m
    where m.profile_id = profiles.id
      and public.is_barbershop_member(m.barbershop_id)
  )
);

-- Convite: somente o owner adiciona membros, e apenas para papéis de equipe.
-- A pessoa precisa já ter criado a conta (o perfil nasce no signup).
create function public.invite_member(
  p_barbershop_id uuid,
  p_email text,
  p_role public.membership_role
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_auth_id uuid;
  target_profile_id uuid;
  existing_id uuid;
  existing_role public.membership_role;
begin
  if not public.has_barbershop_role(p_barbershop_id, array['owner']::public.membership_role[]) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if p_role not in ('manager', 'receptionist', 'professional') then
    raise exception 'INVALID_ROLE' using errcode = 'P0001';
  end if;

  select u.id into target_auth_id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if target_auth_id is not null then
    select p.id into target_profile_id
    from public.profiles p
    where p.auth_user_id = target_auth_id;
  end if;
  if target_profile_id is null then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0001';
  end if;

  select m.id, m.role into existing_id, existing_role
  from public.memberships m
  where m.profile_id = target_profile_id
    and m.barbershop_id = p_barbershop_id;

  if existing_role = 'owner' then
    raise exception 'CANNOT_CHANGE_OWNER' using errcode = 'P0001';
  end if;

  if existing_id is not null then
    update public.memberships
    set role = p_role, status = 'active'
    where id = existing_id;
  else
    insert into public.memberships (profile_id, barbershop_id, role, status)
    values (target_profile_id, p_barbershop_id, p_role, 'active');
  end if;

  insert into public.audit_logs (barbershop_id, actor_profile_id, action, entity_type, entity_id, metadata)
  values (
    p_barbershop_id,
    public.current_profile_id(),
    'membership.invited',
    'membership',
    target_profile_id,
    jsonb_build_object('role', p_role)
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.invite_member(uuid, text, public.membership_role) from public, anon;
grant execute on function public.invite_member(uuid, text, public.membership_role) to authenticated;

-- Reserva pública: no máximo 3 reservas ativas futuras por telefone no tenant,
-- limitando spam de agendamentos sem travar o uso legítimo.
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
returns uuid
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
  join public.services s on s.barbershop_id = b.id and s.id = p_service_id and s.active and s.public_visible
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
  returning id into v_appointment_id;

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

  return v_appointment_id;
exception
  when exclusion_violation then
    raise exception 'APPOINTMENT_CONFLICT' using errcode = 'P0001';
end;
$$;

grant execute on function public.create_public_appointment(text, uuid, uuid, timestamptz, text, text, text, text, jsonb) to anon, authenticated;

commit;
