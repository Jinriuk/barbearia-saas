begin;

create function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1
$$;

create function public.is_barbershop_member(target_barbershop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    join public.profiles p on p.id = m.profile_id
    where p.auth_user_id = auth.uid()
      and m.barbershop_id = target_barbershop_id
      and m.status = 'active'
  )
$$;

create function public.has_barbershop_role(
  target_barbershop_id uuid,
  allowed_roles public.membership_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    join public.profiles p on p.id = m.profile_id
    where p.auth_user_id = auth.uid()
      and m.barbershop_id = target_barbershop_id
      and m.status = 'active'
      and m.role = any(allowed_roles)
  )
$$;

create function public.is_own_professional(target_professional_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.professionals pro
    join public.profiles p on p.id = pro.profile_id
    where pro.id = target_professional_id
      and p.auth_user_id = auth.uid()
  )
$$;

create function public.is_own_client(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clients c
    join public.profiles p on p.id = c.profile_id
    where c.id = target_client_id
      and p.auth_user_id = auth.uid()
  )
$$;

revoke all on function public.current_profile_id() from public;
revoke all on function public.is_barbershop_member(uuid) from public;
revoke all on function public.has_barbershop_role(uuid, public.membership_role[]) from public;
revoke all on function public.is_own_professional(uuid) from public;
revoke all on function public.is_own_client(uuid) from public;
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.is_barbershop_member(uuid) to authenticated;
grant execute on function public.has_barbershop_role(uuid, public.membership_role[]) to authenticated;
grant execute on function public.is_own_professional(uuid) to authenticated;
grant execute on function public.is_own_client(uuid) to authenticated;

alter table public.barbershops enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.services enable row level security;
alter table public.professionals enable row level security;
alter table public.professional_services enable row level security;
alter table public.clients enable row level security;
alter table public.professional_availability enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.appointments enable row level security;
alter table public.tenant_settings enable row level security;
alter table public.public_site_sections enable row level security;
alter table public.audit_logs enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.accounts_payable enable row level security;
alter table public.accounts_receivable enable row level security;
alter table public.commissions enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.tenant_subscriptions enable row level security;

create policy "members can view their barbershops"
on public.barbershops for select to authenticated
using (public.is_barbershop_member(id));

create policy "owners can update their barbershop"
on public.barbershops for update to authenticated
using (public.has_barbershop_role(id, array['owner']::public.membership_role[]))
with check (public.has_barbershop_role(id, array['owner']::public.membership_role[]));

create policy "users can view their profile"
on public.profiles for select to authenticated
using (auth_user_id = auth.uid());

create policy "users can update their profile"
on public.profiles for update to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

create policy "members can view tenant memberships"
on public.memberships for select to authenticated
using (public.is_barbershop_member(barbershop_id));

create policy "owners can add memberships"
on public.memberships for insert to authenticated
with check (public.has_barbershop_role(barbershop_id, array['owner']::public.membership_role[]));

create policy "owners can update memberships"
on public.memberships for update to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner']::public.membership_role[]))
with check (public.has_barbershop_role(barbershop_id, array['owner']::public.membership_role[]));

create policy "owners can remove memberships"
on public.memberships for delete to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner']::public.membership_role[]));

create policy "members can view services"
on public.services for select to authenticated
using (public.is_barbershop_member(barbershop_id));

create policy "administrators can create services"
on public.services for insert to authenticated
with check (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]));

create policy "administrators can update services"
on public.services for update to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]))
with check (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]));

create policy "administrators can delete services"
on public.services for delete to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]));

create policy "members can view professionals"
on public.professionals for select to authenticated
using (public.is_barbershop_member(barbershop_id));

create policy "administrators can manage professionals"
on public.professionals for all to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]))
with check (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]));

create policy "members can view professional services"
on public.professional_services for select to authenticated
using (public.is_barbershop_member(barbershop_id));

create policy "administrators can manage professional services"
on public.professional_services for all to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]))
with check (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]));

create policy "operations can view clients"
on public.clients for select to authenticated
using (
  public.has_barbershop_role(barbershop_id, array['owner','manager','receptionist']::public.membership_role[])
  or public.is_own_client(id)
  or exists (
    select 1 from public.appointments a
    where a.client_id = clients.id and public.is_own_professional(a.professional_id)
  )
);

create policy "operations can create clients"
on public.clients for insert to authenticated
with check (public.has_barbershop_role(barbershop_id, array['owner','manager','receptionist']::public.membership_role[]));

create policy "operations can update clients"
on public.clients for update to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager','receptionist']::public.membership_role[]))
with check (public.has_barbershop_role(barbershop_id, array['owner','manager','receptionist']::public.membership_role[]));

create policy "administrators can delete clients"
on public.clients for delete to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]));

create policy "members can view availability"
on public.professional_availability for select to authenticated
using (public.is_barbershop_member(barbershop_id));

create policy "administrators or owner professional can manage availability"
on public.professional_availability for all to authenticated
using (
  public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[])
  or public.is_own_professional(professional_id)
)
with check (
  public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[])
  or public.is_own_professional(professional_id)
);

create policy "members can view blocks"
on public.schedule_blocks for select to authenticated
using (public.is_barbershop_member(barbershop_id));

create policy "administrators or owner professional can manage blocks"
on public.schedule_blocks for all to authenticated
using (
  public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[])
  or (
    public.is_own_professional(professional_id)
    and exists (select 1 from public.professionals p where p.id = professional_id and p.allow_self_blocks)
  )
)
with check (
  public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[])
  or (
    public.is_own_professional(professional_id)
    and exists (select 1 from public.professionals p where p.id = professional_id and p.allow_self_blocks)
  )
);

create policy "authorized users can view appointments"
on public.appointments for select to authenticated
using (
  public.has_barbershop_role(barbershop_id, array['owner','manager','receptionist']::public.membership_role[])
  or public.is_own_professional(professional_id)
  or public.is_own_client(client_id)
);

create policy "operations can create appointments"
on public.appointments for insert to authenticated
with check (public.has_barbershop_role(barbershop_id, array['owner','manager','receptionist']::public.membership_role[]));

create policy "operations or assigned professional can update appointments"
on public.appointments for update to authenticated
using (
  public.has_barbershop_role(barbershop_id, array['owner','manager','receptionist']::public.membership_role[])
  or public.is_own_professional(professional_id)
)
with check (
  public.has_barbershop_role(barbershop_id, array['owner','manager','receptionist']::public.membership_role[])
  or public.is_own_professional(professional_id)
);

create policy "administrators can delete appointments"
on public.appointments for delete to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]));

create policy "members can view settings"
on public.tenant_settings for select to authenticated
using (public.is_barbershop_member(barbershop_id));

create policy "administrators can update settings"
on public.tenant_settings for update to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]))
with check (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]));

create policy "members can view public sections"
on public.public_site_sections for select to authenticated
using (public.is_barbershop_member(barbershop_id));

create policy "administrators can manage public sections"
on public.public_site_sections for all to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]))
with check (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]));

create policy "administrators can view audit logs"
on public.audit_logs for select to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]));

-- Políticas conservadoras para módulos pós-MVP.
create policy "members can view suppliers" on public.suppliers for select to authenticated
using (public.is_barbershop_member(barbershop_id));
create policy "administrators manage suppliers" on public.suppliers for all to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]))
with check (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]));
create policy "members can view products" on public.products for select to authenticated
using (public.is_barbershop_member(barbershop_id));
create policy "administrators manage products" on public.products for all to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]))
with check (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]));
create policy "members can view inventory" on public.inventory_movements for select to authenticated
using (public.is_barbershop_member(barbershop_id));
create policy "administrators manage inventory" on public.inventory_movements for all to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]))
with check (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]));
create policy "finance roles view transactions" on public.financial_transactions for select to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]));
create policy "finance roles manage transactions" on public.financial_transactions for all to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]))
with check (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]));
create policy "finance roles manage payables" on public.accounts_payable for all to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]))
with check (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]));
create policy "finance roles manage receivables" on public.accounts_receivable for all to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]))
with check (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]));
create policy "finance or professional view commissions" on public.commissions for select to authenticated
using (
  public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[])
  or public.is_own_professional(professional_id)
);
create policy "finance roles manage commissions" on public.commissions for all to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]))
with check (public.has_barbershop_role(barbershop_id, array['owner','manager']::public.membership_role[]));
create policy "authenticated users view active plans" on public.subscription_plans for select to authenticated
using (active);
create policy "owners view subscription" on public.tenant_subscriptions for select to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner']::public.membership_role[]));

create function public.create_barbershop(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_id uuid;
  new_barbershop_id uuid;
  clean_name text := trim(p_name);
  clean_slug text := lower(trim(p_slug));
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  if char_length(clean_name) not between 2 and 100 then
    raise exception 'INVALID_NAME' using errcode = 'P0001';
  end if;
  if clean_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(clean_slug) not between 3 and 63 then
    raise exception 'INVALID_SLUG' using errcode = 'P0001';
  end if;

  select p.id into profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid();
  if profile_id is null then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.barbershops (name, slug)
  values (clean_name, clean_slug)
  returning id into new_barbershop_id;

  insert into public.memberships (profile_id, barbershop_id, role, status)
  values (profile_id, new_barbershop_id, 'owner', 'active');

  insert into public.tenant_settings (barbershop_id)
  values (new_barbershop_id);

  insert into public.audit_logs (barbershop_id, actor_profile_id, action, entity_type, entity_id)
  values (new_barbershop_id, profile_id, 'barbershop.created', 'barbershop', new_barbershop_id);

  return new_barbershop_id;
exception
  when unique_violation then
    raise exception 'SLUG_UNAVAILABLE' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_barbershop(text, text) from public;
grant execute on function public.create_barbershop(text, text) to authenticated;

create function public.get_public_barbershop(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'barbershop', jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'slug', b.slug,
      'logoUrl', b.logo_url,
      'timezone', b.timezone
    ),
    'settings', jsonb_build_object(
      'primaryColor', s.primary_color,
      'secondaryColor', s.secondary_color,
      'backgroundColor', s.background_color,
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
        'id', sv.id,
        'name', sv.name,
        'description', sv.description,
        'price', sv.price,
        'durationMinutes', sv.duration_minutes,
        'imageUrl', sv.image_url
      ) order by sv.name)
      from public.services sv
      where sv.barbershop_id = b.id and sv.active and sv.public_visible
    ), '[]'::jsonb),
    'professionals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pr.id,
        'name', pr.name,
        'bio', pr.bio,
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
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', sec.section_key,
        'title', sec.title,
        'body', sec.body,
        'imageUrl', sec.image_url,
        'ctaLabel', sec.cta_label,
        'ctaUrl', sec.cta_url
      ) order by sec.sort_order)
      from public.public_site_sections sec
      where sec.barbershop_id = b.id and sec.published
    ), '[]'::jsonb)
  )
  from public.barbershops b
  join public.tenant_settings s on s.barbershop_id = b.id
  where b.slug = lower(trim(p_slug))
    and b.status in ('trial', 'active')
  limit 1
$$;

revoke all on function public.get_public_barbershop(text) from public;
grant execute on function public.get_public_barbershop(text) to anon, authenticated;

create function public.get_public_availability(
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
  join public.services s on s.barbershop_id = b.id and s.id = p_service_id and s.active and s.public_visible
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

create function public.create_public_appointment(
  p_slug text,
  p_professional_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_client_name text,
  p_client_phone text,
  p_client_email text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  tenant_id uuid;
  tenant_timezone text;
  duration_minutes integer;
  notice_minutes integer;
  local_start timestamp;
  new_ends_at timestamptz;
  normalized_phone text;
  client_id uuid;
  appointment_id uuid;
begin
  if char_length(trim(p_client_name)) not between 2 and 100 then
    raise exception 'INVALID_CLIENT_NAME' using errcode = 'P0001';
  end if;

  normalized_phone := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
  if normalized_phone !~ '^[0-9]{8,15}$' then
    raise exception 'INVALID_PHONE' using errcode = 'P0001';
  end if;

  select b.id, b.timezone, coalesce(ps.custom_duration_minutes, s.duration_minutes), ts.booking_notice_minutes
  into tenant_id, tenant_timezone, duration_minutes, notice_minutes
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
  returning id into appointment_id;

  insert into public.audit_logs (barbershop_id, action, entity_type, entity_id, metadata)
  values (tenant_id, 'appointment.public_created', 'appointment', appointment_id, jsonb_build_object('source', 'public'));

  return appointment_id;
exception
  when exclusion_violation then
    raise exception 'APPOINTMENT_CONFLICT' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_public_appointment(text, uuid, uuid, timestamptz, text, text, text, text) from public;
grant execute on function public.create_public_appointment(text, uuid, uuid, timestamptz, text, text, text, text) to anon, authenticated;

commit;
