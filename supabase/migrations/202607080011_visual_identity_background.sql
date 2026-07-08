-- Identidade visual: fundo por cor ou imagem (etapa 11.2).
alter table public.tenant_settings
  add column if not exists background_type text not null default 'color'
    check (background_type in ('color', 'image')),
  add column if not exists background_image_url text;

-- get_public_barbershop passa a expor backgroundType e backgroundImageUrl.
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
      'logoUrl', b.logo_url, 'timezone', b.timezone, 'plan', b.plan
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
