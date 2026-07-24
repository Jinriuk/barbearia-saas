-- Vistoria de segurança e integração — rodar no SQL Editor do Supabase.
-- Tudo em transação com ROLLBACK: não deixa nenhum dado no banco.
--
-- O que prova:
--  1) RLS: usuário do tenant A não lê nem escreve dados do tenant B.
--  2) Cadeia financeira: concluir atendimento gera receita de serviço (trigger).
--  3) Cadeia de estoque: confirmar venda reservada gera baixa + receita,
--     e sem saldo a confirmação é bloqueada (INSUFFICIENT_STOCK).

begin;

-- ── Cenário: dois donos, duas barbearias ────────────────────────────────────
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('f0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','vistoria-a@teste.dev','x', now(), '{"provider":"email"}','{"full_name":"Dono A"}', now(), now()),
  ('f0000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','vistoria-b@teste.dev','x', now(), '{"provider":"email"}','{"full_name":"Dono B"}', now(), now());

insert into public.barbershops (id, name, slug, plan) values
  ('e0000000-0000-4000-8000-00000000000a', 'Vistoria A', 'vistoria-a', 'starter'),
  ('e0000000-0000-4000-8000-00000000000b', 'Vistoria B', 'vistoria-b', 'plus');

insert into public.memberships (barbershop_id, profile_id, role)
select 'e0000000-0000-4000-8000-00000000000a'::uuid, p.id, 'owner'::public.membership_role from public.profiles p where p.auth_user_id = 'f0000000-0000-4000-8000-000000000001'
union all
select 'e0000000-0000-4000-8000-00000000000b'::uuid, p.id, 'owner'::public.membership_role from public.profiles p where p.auth_user_id = 'f0000000-0000-4000-8000-000000000002';

insert into public.clients (id, barbershop_id, name, phone, phone_normalized) values
  ('e6000000-0000-4000-8000-00000000000a', 'e0000000-0000-4000-8000-00000000000a', 'Cliente A', '11666666666', '11666666666'),
  ('e6000000-0000-4000-8000-00000000000b', 'e0000000-0000-4000-8000-00000000000b', 'Cliente Secreto B', '11999999999', '11999999999');

-- ── 1) RLS: A não enxerga nem altera B ──────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated"}';

select 'RLS isolamento' as teste,
  (select count(*) from public.clients     where barbershop_id = 'e0000000-0000-4000-8000-00000000000b') = 0 as clientes_b_invisiveis_ok,
  (select count(*) from public.barbershops where id            = 'e0000000-0000-4000-8000-00000000000b') = 0 as barbearia_b_invisivel_ok,
  (select count(*) from public.barbershops where id            = 'e0000000-0000-4000-8000-00000000000a') = 1 as barbearia_propria_ok;

update public.clients set name = 'hackeado'
where barbershop_id = 'e0000000-0000-4000-8000-00000000000b';

reset role;
select 'RLS escrita cruzada' as teste,
  (select count(*) from public.clients
    where barbershop_id = 'e0000000-0000-4000-8000-00000000000b' and name = 'hackeado') = 0 as update_cruzado_bloqueado_ok;

-- ── 2) Conclusão de atendimento gera receita de serviço ────────────────────
insert into public.services (id, barbershop_id, name, price, duration_minutes)
values ('e1000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-00000000000a', 'Corte Vistoria', 50, 30);
insert into public.professionals (id, barbershop_id, name)
values ('e2000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-00000000000a', 'Prof Vistoria');
insert into public.appointments (id, barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source)
values ('e3000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-00000000000a',
        'e6000000-0000-4000-8000-00000000000a', 'e2000000-0000-4000-8000-000000000001',
        'e1000000-0000-4000-8000-000000000001', now() - interval '1 hour', now(), 'confirmed', 'dashboard');

update public.appointments set status = 'completed'
where id = 'e3000000-0000-4000-8000-000000000001';

-- Fase 0: a receita nasce PENDENTE (vendido ≠ recebido), sem paid_at e sem
-- forma de pagamento.
select 'Conclusão → receita pendente' as teste,
  (select count(*) from public.financial_transactions
    where appointment_id = 'e3000000-0000-4000-8000-000000000001' and category = 'service' and amount = 50) = 1 as receita_criada_ok,
  (select status from public.financial_transactions
    where appointment_id = 'e3000000-0000-4000-8000-000000000001' and category = 'service') = 'pending' as receita_pendente_ok,
  (select paid_at is null and payment_method is null from public.financial_transactions
    where appointment_id = 'e3000000-0000-4000-8000-000000000001' and category = 'service') as sem_pagamento_ok;

-- ── 3) Venda de produto: com saldo confirma; sem saldo bloqueia ────────────
insert into public.products (id, barbershop_id, name, sale_price, public_visible)
values ('e4000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-00000000000b', 'Pomada Vistoria', 30, true);
insert into public.inventory_movements (barbershop_id, product_id, type, quantity)
values ('e0000000-0000-4000-8000-00000000000b', 'e4000000-0000-4000-8000-000000000001', 'purchase', 10);

insert into public.services (id, barbershop_id, name, price, duration_minutes)
values ('e1000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-00000000000b', 'Corte B', 40, 30);
insert into public.professionals (id, barbershop_id, name)
values ('e2000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-00000000000b', 'Prof B');
insert into public.appointments (id, barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source)
values ('e3000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-00000000000b',
        'e6000000-0000-4000-8000-00000000000b', 'e2000000-0000-4000-8000-000000000002',
        'e1000000-0000-4000-8000-000000000002', now(), now() + interval '30 min', 'confirmed', 'public');
insert into public.appointment_products (id, barbershop_id, appointment_id, product_id, quantity, unit_price, status)
values ('e5000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-00000000000b',
        'e3000000-0000-4000-8000-000000000002', 'e4000000-0000-4000-8000-000000000001', 2, 30, 'pending');

-- Confirma como o dono B (a RPC valida papel via has_barbershop_role)
set local role authenticated;
set local request.jwt.claims to '{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.confirm_product_sale('e5000000-0000-4000-8000-000000000001');
reset role;

select 'Venda → estoque+receita' as teste,
  (select count(*) from public.inventory_movements
    where product_id = 'e4000000-0000-4000-8000-000000000001' and type = 'sale' and quantity = 2) = 1 as baixa_estoque_ok,
  (select count(*) from public.financial_transactions
    where appointment_id = 'e3000000-0000-4000-8000-000000000002' and category = 'product' and amount = 60) = 1 as receita_produto_ok,
  -- Fase 0: sem forma de pagamento na confirmação, a receita nasce pendente.
  (select status from public.financial_transactions
    where appointment_id = 'e3000000-0000-4000-8000-000000000002' and category = 'product') = 'pending' as receita_produto_pendente_ok,
  (select status from public.appointment_products where id = 'e5000000-0000-4000-8000-000000000001') = 'confirmed' as reserva_confirmada_ok;

-- 3b) Sem saldo: reserva de 99 unidades (só 8 restantes) deve falhar com
-- INSUFFICIENT_STOCK (exige a migration 202607080016 aplicada). A reserva
-- precisa de um atendimento próprio: (appointment_id, product_id) é único e
-- o atendimento anterior já tem reserva confirmada deste produto.
insert into public.appointments (id, barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source)
values ('e3000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-00000000000b',
        'e6000000-0000-4000-8000-00000000000b', 'e2000000-0000-4000-8000-000000000002',
        'e1000000-0000-4000-8000-000000000002', now() + interval '2 hour', now() + interval '150 min', 'confirmed', 'public');
insert into public.appointment_products (id, barbershop_id, appointment_id, product_id, quantity, unit_price, status)
values ('e5000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-00000000000b',
        'e3000000-0000-4000-8000-000000000003', 'e4000000-0000-4000-8000-000000000001', 99, 30, 'pending');

do $$
begin
  begin
    set local role authenticated;
    set local request.jwt.claims to '{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated"}';
    perform public.confirm_product_sale('e5000000-0000-4000-8000-000000000002');
    raise notice 'ALERTA: venda sem saldo NÃO foi bloqueada';
  exception when others then
    raise notice 'OK: venda sem saldo bloqueada (%)', sqlerrm;
  end;
  reset role;
end $$;

rollback;
