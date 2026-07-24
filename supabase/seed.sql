-- Seed público e sem credenciais. Use apenas em desenvolvimento.
-- A demonstração usa o plano Plus para exercitar white label e upsell de produtos.

-- Trava de produção (Fase 0): se o banco já tem tenants reais (fora das
-- demos deste seed), aborta antes de inserir qualquer coisa. Em um banco
-- recém-resetado de desenvolvimento a checagem passa sem atrito.
do $$
begin
  if exists (
    select 1 from public.barbershops
    where id not in (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002'
    )
  ) then
    raise exception
      'seed.sql bloqueado: o banco contém tenants reais. Este seed é apenas para desenvolvimento.';
  end if;
end;
$$;
insert into public.barbershops (id, name, slug, status, plan)
values ('10000000-0000-4000-8000-000000000001', 'Barbearia Aurora', 'aurora', 'active', 'plus')
on conflict (id) do nothing;

insert into public.tenant_settings (
  id, barbershop_id, primary_color, secondary_color, background_color,
  hero_title, hero_subtitle, whatsapp_number, instagram_url, address, opening_hours
)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '#C6924B',
  '#191816',
  '#F6F2EA',
  'Ritual, precisão e presença.',
  'Um horário reservado só para você, sem fila e sem pressa.',
  '5511999999999',
  'https://instagram.com/',
  'Rua Exemplo, 120 — Centro',
  '{"monday":"09:00–19:00","tuesday":"09:00–19:00","wednesday":"09:00–19:00","thursday":"09:00–20:00","friday":"09:00–20:00","saturday":"09:00–18:00"}'
)
on conflict (barbershop_id) do nothing;

insert into public.services (
  id, barbershop_id, name, description, price, duration_minutes, commission_rate
)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Corte assinatura', 'Consulta rápida, corte e finalização.', 65, 45, 40),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Barba clássica', 'Toalha quente, desenho e hidratação.', 45, 30, 40),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Corte + barba', 'Experiência completa com acabamento.', 100, 75, 40)
on conflict (id) do nothing;

insert into public.professionals (id, barbershop_id, name, bio)
values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Rafael', 'Especialista em cortes clássicos e barba.'),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Caio', 'Textura, degradê e acabamento natural.')
on conflict (id) do nothing;

insert into public.professional_services (barbershop_id, professional_id, service_id)
select
  '10000000-0000-4000-8000-000000000001'::uuid,
  professional_id,
  service_id
from (
  values
    ('40000000-0000-4000-8000-000000000001'::uuid, '30000000-0000-4000-8000-000000000001'::uuid),
    ('40000000-0000-4000-8000-000000000001'::uuid, '30000000-0000-4000-8000-000000000002'::uuid),
    ('40000000-0000-4000-8000-000000000001'::uuid, '30000000-0000-4000-8000-000000000003'::uuid),
    ('40000000-0000-4000-8000-000000000002'::uuid, '30000000-0000-4000-8000-000000000001'::uuid),
    ('40000000-0000-4000-8000-000000000002'::uuid, '30000000-0000-4000-8000-000000000003'::uuid)
) as pairs(professional_id, service_id)
on conflict do nothing;

-- Produtos publicáveis para o upsell no checkout (recurso Plus).
insert into public.products (
  barbershop_id, name, description, sku, cost_price, sale_price, minimum_stock, active, public_visible
)
values
  ('10000000-0000-4000-8000-000000000001', 'Pomada Modeladora', 'Fixação forte com acabamento fosco.', 'AUR-POM-01', 18.00, 45.00, 5, true, true),
  ('10000000-0000-4000-8000-000000000001', 'Óleo para Barba', 'Hidrata e alinha os fios.', 'AUR-OLE-01', 22.00, 59.00, 5, true, true),
  ('10000000-0000-4000-8000-000000000001', 'Shampoo Detox', 'Limpeza profunda para couro cabeludo.', 'AUR-SHP-01', 20.00, 39.00, 5, true, true)
on conflict (barbershop_id, sku) do nothing;

insert into public.professional_availability (
  barbershop_id, professional_id, weekday, starts_at, ends_at, slot_interval_minutes
)
select
  '10000000-0000-4000-8000-000000000001'::uuid,
  p.id,
  d.weekday,
  '09:00'::time,
  case when d.weekday = 6 then '18:00'::time else '19:00'::time end,
  15
from public.professionals p
cross join (values (1),(2),(3),(4),(5),(6)) as d(weekday)
where p.barbershop_id = '10000000-0000-4000-8000-000000000001'
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Demo da vertical feminina (NexoBeleza): Studio Aurora — /studio-aurora.
-- Espelha a demo criada no banco de produção: vertical salon, plano Plus,
-- assinatura active de longo prazo e tema Rosé elegante.
insert into public.barbershops (id, name, slug, status, plan, vertical)
values ('10000000-0000-4000-8000-000000000002', 'Studio Aurora', 'studio-aurora', 'active', 'plus', 'salon')
on conflict (id) do nothing;

insert into public.tenant_settings (
  id, barbershop_id, primary_color, secondary_color, background_color,
  hero_title, hero_subtitle, address, opening_hours
)
values (
  '20000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000002',
  '#c2497c',
  '#33202b',
  '#fdf8f5',
  'Realce a sua beleza, no seu tempo.',
  'Escolha o serviço, a profissional e o melhor horário — tudo online, sem fila e sem espera.',
  'Rua das Flores, 250 — Jardins, São Paulo',
  '{"monday":"09:00–19:00","tuesday":"09:00–19:00","wednesday":"09:00–19:00","thursday":"09:00–19:00","friday":"09:00–19:00","saturday":"09:00–19:00"}'
)
on conflict (barbershop_id) do nothing;

-- Assinatura ativa de longuíssimo prazo: a demo nunca cai.
insert into public.subscriptions (id, barbershop_id, plan, status, price_cents, current_period_end)
values (
  '50000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000002',
  'plus', 'active', 9990, now() + interval '10 years'
)
on conflict (barbershop_id) do nothing;

insert into public.services (
  id, barbershop_id, name, description, category, price, duration_minutes, commission_rate
)
values
  ('31000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Coloração', 'Cor personalizada com análise de tom e cuidado com os fios.', 'Cabelo', 180, 120, 40),
  ('31000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Escova', 'Escova modelada com finalização profissional.', 'Cabelo', 60, 40, 40),
  ('31000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'Manicure + Pedicure', 'Cuidado completo das unhas com esmaltação impecável.', 'Unhas', 75, 60, 40),
  ('31000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'Maquiagem', 'Make profissional para eventos, festas e ocasiões especiais.', 'Maquiagem', 130, 60, 40),
  ('31000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 'Hidratação', 'Tratamento profundo para devolver brilho e maciez.', 'Tratamentos', 90, 45, 40),
  ('31000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002', 'Design de sobrancelhas', 'Modelagem que valoriza o seu olhar.', 'Sobrancelhas', 45, 30, 40)
on conflict (id) do nothing;

insert into public.professionals (id, barbershop_id, name, bio)
values
  ('41000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Helena', 'Colorista e especialista em tratamentos capilares.'),
  ('41000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Valentina', 'Nail designer e design de sobrancelhas com olhar de detalhe.'),
  ('41000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'Sofia', 'Maquiadora e hair stylist para todas as ocasiões.')
on conflict (id) do nothing;

insert into public.professional_services (barbershop_id, professional_id, service_id)
select
  '10000000-0000-4000-8000-000000000002'::uuid,
  professional_id,
  service_id
from (
  values
    ('41000000-0000-4000-8000-000000000001'::uuid, '31000000-0000-4000-8000-000000000001'::uuid),
    ('41000000-0000-4000-8000-000000000001'::uuid, '31000000-0000-4000-8000-000000000002'::uuid),
    ('41000000-0000-4000-8000-000000000001'::uuid, '31000000-0000-4000-8000-000000000005'::uuid),
    ('41000000-0000-4000-8000-000000000002'::uuid, '31000000-0000-4000-8000-000000000003'::uuid),
    ('41000000-0000-4000-8000-000000000002'::uuid, '31000000-0000-4000-8000-000000000006'::uuid),
    ('41000000-0000-4000-8000-000000000002'::uuid, '31000000-0000-4000-8000-000000000004'::uuid),
    ('41000000-0000-4000-8000-000000000003'::uuid, '31000000-0000-4000-8000-000000000002'::uuid),
    ('41000000-0000-4000-8000-000000000003'::uuid, '31000000-0000-4000-8000-000000000004'::uuid),
    ('41000000-0000-4000-8000-000000000003'::uuid, '31000000-0000-4000-8000-000000000005'::uuid)
) as pairs(professional_id, service_id)
on conflict do nothing;

-- Disponibilidade seg–sáb, 09:00–19:00.
insert into public.professional_availability (
  barbershop_id, professional_id, weekday, starts_at, ends_at, slot_interval_minutes
)
select
  '10000000-0000-4000-8000-000000000002'::uuid,
  p.id,
  d.weekday,
  '09:00'::time,
  '19:00'::time,
  15
from public.professionals p
cross join (values (1),(2),(3),(4),(5),(6)) as d(weekday)
where p.barbershop_id = '10000000-0000-4000-8000-000000000002'
on conflict do nothing;

-- Produtos de beleza para o upsell no checkout (recurso Plus).
insert into public.products (
  barbershop_id, name, description, sku, cost_price, sale_price, minimum_stock, active, public_visible
)
values
  ('10000000-0000-4000-8000-000000000002', 'Máscara de Hidratação Profunda', 'Nutrição intensa para fios ressecados.', 'SAU-MAS-01', 32.00, 89.00, 3, true, true),
  ('10000000-0000-4000-8000-000000000002', 'Sérum Capilar Reparador', 'Brilho e proteção térmica no dia a dia.', 'SAU-SER-01', 28.00, 75.00, 3, true, true),
  ('10000000-0000-4000-8000-000000000002', 'Kit Esmaltes Nude', 'Trio de tons neutros para todas as estações.', 'SAU-ESM-01', 18.00, 49.00, 3, true, true)
on conflict (barbershop_id, sku) do nothing;

-- Estoque inicial 10 de cada (uma única entrada por produto).
insert into public.inventory_movements (barbershop_id, product_id, type, quantity, unit_cost, reason)
select pd.barbershop_id, pd.id, 'purchase', 10, pd.cost_price, 'Estoque inicial da demonstração'
from public.products pd
where pd.barbershop_id = '10000000-0000-4000-8000-000000000002'
  and not exists (
    select 1 from public.inventory_movements im
    where im.product_id = pd.id and im.type = 'purchase'
  );
