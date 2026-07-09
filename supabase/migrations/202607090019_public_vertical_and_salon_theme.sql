-- Vertical na página pública + tema padrão por vertical.
--
-- 1) get_public_barbershop passa a expor barbershop.vertical, permitindo que
--    a página do cliente final adapte textos e fotos (barbearia × salão).
-- 2) create_barbershop cria tenant_settings já com a paleta da vertical:
--    salão nasce rosé (#c2497c/#33202b/#fdf8f5); barbearia mantém os
--    defaults atuais. Regra de ouro: a personalização do dono SEMPRE vence —
--    isso muda apenas o ponto de partida.

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

create or replace function public.create_barbershop(
  p_name text,
  p_slug text,
  p_plan text,
  p_vertical text
)
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
  clean_plan text := coalesce(nullif(trim(p_plan), ''), 'starter');
  clean_vertical text := coalesce(nullif(trim(p_vertical), ''), 'barber');
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
  if clean_plan not in ('starter', 'plus') then
    raise exception 'INVALID_PLAN' using errcode = 'P0001';
  end if;
  if clean_vertical not in ('barber', 'salon') then
    raise exception 'INVALID_VERTICAL' using errcode = 'P0001';
  end if;

  select p.id into profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid();
  if profile_id is null then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.barbershops (name, slug, plan, vertical)
  values (clean_name, clean_slug, clean_plan, clean_vertical)
  returning id into new_barbershop_id;

  insert into public.memberships (profile_id, barbershop_id, role, status)
  values (profile_id, new_barbershop_id, 'owner', 'active');

  -- Ponto de partida do tema conforme a vertical; o dono personaliza depois.
  if clean_vertical = 'salon' then
    insert into public.tenant_settings
      (barbershop_id, primary_color, secondary_color, background_color)
    values (new_barbershop_id, '#c2497c', '#33202b', '#fdf8f5');
  else
    insert into public.tenant_settings (barbershop_id)
    values (new_barbershop_id);
  end if;

  insert into public.subscriptions
    (barbershop_id, plan, status, price_cents, trial_ends_at)
  values
    (new_barbershop_id, clean_plan, 'trialing',
     case when clean_plan = 'plus' then 9990 else 4990 end,
     now() + interval '7 days');

  insert into public.audit_logs (barbershop_id, actor_profile_id, action, entity_type, entity_id)
  values (new_barbershop_id, profile_id, 'barbershop.created', 'barbershop', new_barbershop_id);

  return new_barbershop_id;
exception
  when unique_violation then
    raise exception 'SLUG_UNAVAILABLE' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_barbershop(text, text, text, text) from public, anon;
grant execute on function public.create_barbershop(text, text, text, text) to authenticated;
