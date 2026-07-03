-- Seed público e sem credenciais. Use apenas em desenvolvimento.
-- A demonstração usa o plano Plus para exercitar white label e upsell de produtos.
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
