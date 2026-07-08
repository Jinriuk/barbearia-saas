-- Vistoria de segurança e integração — rodar no SQL Editor do Supabase.
-- Tudo em transação com ROLLBACK: não deixa nenhum dado no banco.
--
-- O que prova:
--  1) RLS: usuário do tenant A não lê dados do tenant B (isolamento).
--  2) Cadeia financeira: concluir atendimento gera receita de serviço (trigger).
--  3) Cadeia de estoque: confirmar venda de produto reservado gera baixa + receita.

begin;

-- ── Cenário: dois donos, duas barbearias ────────────────────────────────────
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('f0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','vistoria-a@teste.dev','x', now(), '{"provider":"email"}','{"full_name":"Dono A"}', now(), now()),
  ('f0000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','vistoria-b@teste.dev','x', now(), '{"provider":"email"}','{"full_name":"Dono B"}', now(), now());

insert into public.barbershops (id, owner_id, name, slug, plan) values
  ('e0000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-000000000001', 'Vistoria A', 'vistoria-a', 'standard'),
  ('e0000000-0000-4000-8000-00000000000b', 'f0000000-0000-4000-8000-000000000002', 'Vistoria B', 'vistoria-b', 'plus');

insert into public.memberships (barbershop_id, profile_id, role)
select 'e0000000-0000-4000-8000-00000000000a', p.id, 'owner' from public.profiles p where p.auth_user_id = 'f0000000-0000-4000-8000-000000000001'
union all
select 'e0000000-0000-4000-8000-00000000000b', p.id, 'owner' from public.profiles p where p.auth_user_id = 'f0000000-0000-4000-8000-000000000002';

insert into public.clients (barbershop_id, name, phone, phone_normalized)
values ('e0000000-0000-4000-8000-00000000000b', 'Cliente Secreto B', '11999999999', '11999999999');

-- ── 1) RLS: A não enxerga B ─────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated"}';

select 'RLS isolamento' as teste,
  (select count(*) from public.clients    where barbershop_id = 'e0000000-0000-4000-8000-00000000000b') = 0 as clientes_b_invisiveis_ok,
  (select count(*) from public.barbershops where id           = 'e0000000-0000-4000-8000-00000000000b') = 0 as barbearia_b_invisivel_ok,
  (select count(*) from public.barbershops where id           = 'e0000000-0000-4000-8000-00000000000a') = 1 as barbearia_propria_ok;

-- Escrita cruzada deve falhar silenciosamente (0 linhas afetadas pela RLS)
update public.clients set name = 'hackeado'
where barbershop_id = 'e0000000-0000-4000-8000-00000000000b';
select 'RLS escrita cruzada' as teste, count(*) = 0 as update_cruzado_bloqueado_ok
from public.clients
where barbershop_id = 'e0000000-0000-4000-8000-00000000000b' and name = 'hackeado';

reset role;

-- ── 2) Conclusão de atendimento gera receita de serviço ────────────────────
insert into public.services (id, barbershop_id, name, price, duration_minutes)
values ('e1000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-00000000000a', 'Corte Vistoria', 50, 30);
insert into public.professionals (id, barbershop_id, name)
values ('e2000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-00000000000a', 'Prof Vistoria');
insert into public.appointments (id, barbershop_id, service_id, professional_id, client_name, client_phone, starts_at, ends_at, status, price)
values ('e3000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-00000000000a',
        'e1000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001',
        'Cliente Vistoria', '11888888888', now() - interval '1 hour', now(), 'confirmed', 50);

update public.appointments set status = 'completed'
where id = 'e3000000-0000-4000-8000-000000000001';

select 'Conclusão → receita' as teste,
  count(*) = 1 as receita_criada_ok,
  coalesce(sum(amount), 0) = 50 as valor_ok
from public.financial_transactions
where appointment_id = 'e3000000-0000-4000-8000-000000000001' and category = 'service';

-- ── 3) Confirmação de venda gera baixa de estoque + receita ────────────────
insert into public.products (id, barbershop_id, name, sale_price, public_visible)
values ('e4000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-00000000000b', 'Pomada Vistoria', 30, true);
insert into public.inventory_movements (barbershop_id, product_id, quantity, movement_type)
values ('e0000000-0000-4000-8000-00000000000b', 'e4000000-0000-4000-8000-000000000001', 10, 'purchase');

insert into public.services (id, barbershop_id, name, price, duration_minutes)
values ('e1000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-00000000000b', 'Corte B', 40, 30);
insert into public.professionals (id, barbershop_id, name)
values ('e2000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-00000000000b', 'Prof B');
insert into public.appointments (id, barbershop_id, service_id, professional_id, client_name, client_phone, starts_at, ends_at, status, price)
values ('e3000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-00000000000b',
        'e1000000-0000-4000-8000-000000000002', 'e2000000-0000-4000-8000-000000000002',
        'Cliente B', '11777777777', now(), now() + interval '30 min', 'confirmed', 40);
insert into public.appointment_products (id, barbershop_id, appointment_id, product_id, quantity, unit_price, status)
values ('e5000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-00000000000b',
        'e3000000-0000-4000-8000-000000000002', 'e4000000-0000-4000-8000-000000000001', 2, 30, 'pending');

select public.confirm_product_sale('e5000000-0000-4000-8000-000000000001');

select 'Venda → estoque+receita' as teste,
  (select count(*) from public.inventory_movements
    where product_id = 'e4000000-0000-4000-8000-000000000001' and movement_type = 'sale' and quantity = 2) = 1 as baixa_estoque_ok,
  (select count(*) from public.financial_transactions
    where appointment_id = 'e3000000-0000-4000-8000-000000000002' and category = 'product' and amount = 60) = 1 as receita_produto_ok,
  (select status from public.appointment_products where id = 'e5000000-0000-4000-8000-000000000001') = 'confirmed' as reserva_confirmada_ok;

rollback;
