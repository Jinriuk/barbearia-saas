begin;

-- =========================================================================
-- Evolução SaaS: planos (Padrão/Plus), financeiro operável e upsell de
-- produtos exclusivo do Plus. Mantém o isolamento por tenant e a RLS.
-- =========================================================================

-- Plano do tenant: 'starter' (Padrão, layout fixo) e 'plus' (white label).
alter table public.barbershops
  drop constraint if exists barbershops_plan_check;
alter table public.barbershops
  add constraint barbershops_plan_check check (plan in ('starter', 'plus'));

-- Forma de pagamento das receitas confirmadas na aba financeira.
create type public.payment_method as enum ('cash', 'card', 'pix', 'other');

alter table public.financial_transactions
  add column if not exists payment_method public.payment_method;

-- Uma única receita por agendamento (idempotência da confirmação de pagamento).
create unique index if not exists financial_transactions_income_appointment_key
  on public.financial_transactions (appointment_id)
  where appointment_id is not null and type = 'income';

-- Produtos adicionados a um agendamento (upsell — recurso Plus).
create table public.appointment_products (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  appointment_id uuid not null,
  product_id uuid not null,
  quantity integer not null default 1 check (quantity between 1 and 99),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  constraint appointment_products_unique unique (appointment_id, product_id),
  foreign key (appointment_id, barbershop_id)
    references public.appointments(id, barbershop_id) on delete cascade,
  foreign key (product_id, barbershop_id)
    references public.products(id, barbershop_id) on delete restrict
);

create index appointment_products_appointment_idx
  on public.appointment_products (appointment_id);

alter table public.appointment_products enable row level security;

create policy "members can view appointment products"
on public.appointment_products for select to authenticated
using (public.is_barbershop_member(barbershop_id));

create policy "operations manage appointment products"
on public.appointment_products for all to authenticated
using (public.has_barbershop_role(barbershop_id, array['owner','manager','receptionist']::public.membership_role[]))
with check (public.has_barbershop_role(barbershop_id, array['owner','manager','receptionist']::public.membership_role[]));

-- =========================================================================
-- Página pública: expõe o plano e os produtos publicáveis para o upsell.
-- =========================================================================
create or replace function public.get_public_barbershop(p_slug text)
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
      'timezone', b.timezone,
      'plan', b.plan
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
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pd.id,
        'name', pd.name,
        'description', pd.description,
        'price', pd.sale_price,
        'imageUrl', pd.image_url
      ) order by pd.name)
      from public.products pd
      where pd.barbershop_id = b.id and pd.active and pd.public_visible and b.plan = 'plus'
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

grant execute on function public.get_public_barbershop(text) to anon, authenticated;

-- =========================================================================
-- Reserva pública com upsell opcional de produtos (aplicado só no Plus).
-- =========================================================================
drop function if exists public.create_public_appointment(text, uuid, uuid, timestamptz, text, text, text, text);

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
    for product_item in select * from jsonb_array_elements(p_products)
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
