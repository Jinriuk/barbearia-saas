-- Fase 3 (operação): agendamento manual pelo painel + fotos de
-- profissionais/produtos.
--
-- 1) create_manual_appointment: o balcão (owner/manager/receptionist) lança
--    um horário direto na agenda. Reusa a mesma validação de conflito do
--    fluxo público — a exclusion constraint de appointments — devolvendo
--    SLOT_TAKEN quando o horário acabou de ser ocupado (por outro manual ou
--    pelo público, tanto faz). Bloqueio de agenda também conta como tomado.
-- 2) Policies de storage para os caminhos professionals/{barbershop_id}/* e
--    products/{barbershop_id}/*, espelhando as da logo (dono/gerente).
--    O limite de 2 MB por foto é aplicado na aplicação; o bucket já limita
--    5 MB e os MIME types a jpg/png/webp.

create or replace function public.create_manual_appointment(
  p_barbershop_id uuid,
  p_client_id uuid,
  p_client_name text,
  p_client_phone text,
  p_service_id uuid,
  p_professional_id uuid,
  p_starts_at timestamptz,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id uuid;
  v_duration_minutes integer;
  new_ends_at timestamptz;
  normalized_phone text;
  v_client_id uuid;
  v_appointment_id uuid;
begin
  if not public.has_barbershop_role(
    p_barbershop_id,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  ) then
    raise exception 'NOT_ALLOWED' using errcode = 'P0001';
  end if;

  if p_starts_at is null then
    raise exception 'INVALID_START' using errcode = 'P0001';
  end if;

  select p.id into actor_profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid();

  -- Duração pela combinação serviço × profissional (respeita duração custom).
  select coalesce(ps.custom_duration_minutes, s.duration_minutes)
  into v_duration_minutes
  from public.services s
  join public.professional_services ps
    on ps.service_id = s.id and ps.professional_id = p_professional_id
  join public.professionals pr
    on pr.id = p_professional_id and pr.barbershop_id = s.barbershop_id and pr.active
  where s.id = p_service_id and s.barbershop_id = p_barbershop_id and s.active;

  if v_duration_minutes is null then
    raise exception 'SERVICE_CONTEXT_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- Cliente: usa o existente ou acha/cria pelo telefone normalizado,
  -- exatamente como no fluxo público.
  if p_client_id is not null then
    select c.id into v_client_id
    from public.clients c
    where c.id = p_client_id and c.barbershop_id = p_barbershop_id;
    if v_client_id is null then
      raise exception 'CLIENT_NOT_FOUND' using errcode = 'P0001';
    end if;
  else
    if char_length(trim(coalesce(p_client_name, ''))) not between 2 and 100 then
      raise exception 'INVALID_CLIENT_NAME' using errcode = 'P0001';
    end if;
    normalized_phone := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
    if normalized_phone !~ '^[0-9]{8,15}$' then
      raise exception 'INVALID_PHONE' using errcode = 'P0001';
    end if;
    insert into public.clients (barbershop_id, name, phone, phone_normalized)
    values (
      p_barbershop_id,
      trim(p_client_name),
      trim(p_client_phone),
      normalized_phone
    )
    on conflict (barbershop_id, phone_normalized)
    do update set
      name = excluded.name,
      phone = excluded.phone
    returning id into v_client_id;
  end if;

  new_ends_at := p_starts_at + make_interval(mins => v_duration_minutes);

  -- Bloqueio de agenda cobre o intervalo? Horário tomado.
  if exists (
    select 1 from public.schedule_blocks sb
    where sb.barbershop_id = p_barbershop_id
      and sb.professional_id = p_professional_id
      and tstzrange(sb.starts_at, sb.ends_at, '[)') && tstzrange(p_starts_at, new_ends_at, '[)')
  ) then
    raise exception 'SLOT_TAKEN' using errcode = 'P0001';
  end if;

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
    created_by
  )
  values (
    p_barbershop_id,
    v_client_id,
    p_professional_id,
    p_service_id,
    p_starts_at,
    new_ends_at,
    'confirmed',
    nullif(trim(p_notes), ''),
    'dashboard',
    actor_profile_id
  )
  returning id into v_appointment_id;

  insert into public.audit_logs (barbershop_id, actor_profile_id, action, entity_type, entity_id, metadata)
  values (
    p_barbershop_id,
    actor_profile_id,
    'appointment.manual_created',
    'appointment',
    v_appointment_id,
    jsonb_build_object('source', 'dashboard')
  );

  return v_appointment_id;
exception
  -- A exclusion constraint de appointments é a mesma barreira do fluxo
  -- público: dois atendimentos do mesmo profissional nunca se sobrepõem.
  when exclusion_violation then
    raise exception 'SLOT_TAKEN' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_manual_appointment(uuid, uuid, text, text, uuid, uuid, timestamptz, text) from public, anon;
grant execute on function public.create_manual_appointment(uuid, uuid, text, text, uuid, uuid, timestamptz, text) to authenticated;

-- ── Storage: fotos de profissionais e produtos ──────────────────────────────
-- Caminhos professionals/{barbershop_id}/* e products/{barbershop_id}/*:
-- o tenant fica na SEGUNDA pasta (a primeira é o tipo do asset), então as
-- policies existentes (que validam a primeira pasta como uuid) não cobrem.

create policy "members can upload professional and product photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'public-assets'
  and (storage.foldername(name))[1] in ('professionals', 'products')
  and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  and public.has_barbershop_role(
    ((storage.foldername(name))[2])::uuid,
    array['owner','manager']::public.membership_role[]
  )
);

create policy "members can update professional and product photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'public-assets'
  and (storage.foldername(name))[1] in ('professionals', 'products')
  and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  and public.has_barbershop_role(
    ((storage.foldername(name))[2])::uuid,
    array['owner','manager']::public.membership_role[]
  )
)
with check (
  bucket_id = 'public-assets'
  and (storage.foldername(name))[1] in ('professionals', 'products')
  and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  and public.has_barbershop_role(
    ((storage.foldername(name))[2])::uuid,
    array['owner','manager']::public.membership_role[]
  )
);

create policy "members can delete professional and product photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'public-assets'
  and (storage.foldername(name))[1] in ('professionals', 'products')
  and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
  and public.has_barbershop_role(
    ((storage.foldername(name))[2])::uuid,
    array['owner','manager']::public.membership_role[]
  )
);
