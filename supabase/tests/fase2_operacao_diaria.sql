-- Fase 2 — testes da operação diária. Transação com ROLLBACK.
--
-- O que prova:
--  1) Estado "Em atendimento": confirmed→in_progress→completed vale,
--     iniciar no futuro é bloqueado, pending→no_show passou a valer e um
--     atendimento em curso continua ocupando o horário (exclusion).
--  2) Estoque: a view product_stock_balances (Fase 0.6) soma o ledger
--     INTEIRO e agora traz a última movimentação; a trava da Fase 0.8
--     impede saldo negativo por saída manual.
--  3) Venda de balcão: itens, baixa de estoque e receita numa transação;
--     estoque insuficiente e desconto maior que o total derrubam a venda.
--  4) "Finalizar e receber": conclui e marca a receita como paga.
--  5) Clientes: segmentos assinantes/inadimplentes, situação do plano por
--     linha e o gasto do assinante deixando de ser R$ 0,00.

begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('f5000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fase2op@teste.dev','x', now(), '{"provider":"email"}','{"full_name":"Dono Op"}', now(), now());

insert into public.barbershops (id, name, slug) values
  ('b0000000-0000-4000-8000-00000000000a', 'Fase2 Op', 'fase2-op');
insert into public.tenant_settings (barbershop_id) values ('b0000000-0000-4000-8000-00000000000a');
insert into public.memberships (barbershop_id, profile_id, role)
select 'b0000000-0000-4000-8000-00000000000a'::uuid, p.id, 'owner'::public.membership_role
from public.profiles p where p.auth_user_id = 'f5000000-0000-4000-8000-000000000001';

insert into public.clients (id, barbershop_id, name, phone, phone_normalized) values
  ('b6000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-00000000000a', 'Cliente Comum', '11955550001', '11955550001'),
  ('b6000000-0000-4000-8000-00000000000b', 'b0000000-0000-4000-8000-00000000000a', 'Cliente Assinante', '11955550002', '11955550002'),
  ('b6000000-0000-4000-8000-00000000000c', 'b0000000-0000-4000-8000-00000000000a', 'Cliente Inadimplente', '11955550003', '11955550003');
insert into public.services (id, barbershop_id, name, price, duration_minutes) values
  ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000a', 'Corte Op', 60, 30);
insert into public.professionals (id, barbershop_id, name) values
  ('b2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000a', 'Vendedor Op');
insert into public.professional_services (barbershop_id, professional_id, service_id) values
  ('b0000000-0000-4000-8000-00000000000a', 'b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001');

-- ── 1) Estado "Em atendimento" ──────────────────────────────────────────────
insert into public.appointments (id, barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source)
values
  ('b3000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000a',
   'b6000000-0000-4000-8000-00000000000a', 'b2000000-0000-4000-8000-000000000001',
   'b1000000-0000-4000-8000-000000000001', now() - interval '2 hour', now() - interval '90 min', 'confirmed', 'dashboard'),
  ('b3000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-00000000000a',
   'b6000000-0000-4000-8000-00000000000a', 'b2000000-0000-4000-8000-000000000001',
   'b1000000-0000-4000-8000-000000000001', now() + interval '2 day', now() + interval '2 day' + interval '30 min', 'confirmed', 'dashboard'),
  -- horário que passou e nunca foi confirmado: vira falta direto
  ('b3000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-00000000000a',
   'b6000000-0000-4000-8000-00000000000a', 'b2000000-0000-4000-8000-000000000001',
   'b1000000-0000-4000-8000-000000000001', now() - interval '5 hour', now() - interval '4 hour 30 min', 'pending', 'dashboard');

update public.appointments set status = 'in_progress'
where id = 'b3000000-0000-4000-8000-000000000001';
select '1a. Em atendimento' as teste,
  (select status from public.appointments
    where id = 'b3000000-0000-4000-8000-000000000001') = 'in_progress' as iniciar_ok;

do $$
begin
  begin
    update public.appointments set status = 'in_progress'
    where id = 'b3000000-0000-4000-8000-000000000002'; -- horário FUTURO
    raise notice 'ALERTA: iniciar no futuro aceito';
  exception when others then
    raise notice '1b. OK: iniciar no futuro bloqueado (%)', sqlerrm;
  end;
end $$;

update public.appointments set status = 'no_show'
where id = 'b3000000-0000-4000-8000-000000000003';
select '1c. Falta sem confirmar antes' as teste,
  (select status from public.appointments
    where id = 'b3000000-0000-4000-8000-000000000003') = 'no_show' as falta_ok;

-- Em atendimento continua ocupando o horário do profissional.
do $$
begin
  begin
    insert into public.appointments (barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source)
    values ('b0000000-0000-4000-8000-00000000000a', 'b6000000-0000-4000-8000-00000000000b',
            'b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001',
            now() - interval '2 hour', now() - interval '90 min', 'pending', 'dashboard');
    raise notice 'ALERTA: horário sobreposto a um atendimento em curso aceito';
  exception when exclusion_violation then
    raise notice '1d. OK: em atendimento continua ocupando o horário';
  end;
end $$;

-- ── 2) Estoque ──────────────────────────────────────────────────────────────
insert into public.products (id, barbershop_id, name, sale_price, cost_price, minimum_stock) values
  ('b4000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000a', 'Pomada Op', 40, 20, 5);

-- 500 entradas de 1 unidade: acima do recorte de 400 que a tela usava.
insert into public.inventory_movements (barbershop_id, product_id, type, quantity)
select 'b0000000-0000-4000-8000-00000000000a', 'b4000000-0000-4000-8000-000000000001',
       'purchase', 1
from generate_series(1, 500);

set local role authenticated;
set local request.jwt.claims to '{"sub":"f5000000-0000-4000-8000-000000000001","role":"authenticated"}';
select '2a. Saldo do ledger inteiro' as teste,
  (select on_hand from public.product_stock_balances
    where product_id = 'b4000000-0000-4000-8000-000000000001') = 500 as saldo_ok,
  (select last_movement_at is not null from public.product_stock_balances
    where product_id = 'b4000000-0000-4000-8000-000000000001') as ultima_mov_ok;
reset role;

do $$
begin
  begin
    insert into public.inventory_movements (barbershop_id, product_id, type, quantity)
    values ('b0000000-0000-4000-8000-00000000000a', 'b4000000-0000-4000-8000-000000000001',
            'loss', 501);
    raise notice 'ALERTA: saída maior que o saldo aceita (estoque negativo)';
  exception when others then
    raise notice '2b. OK: estoque negativo bloqueado (%)', sqlerrm;
  end;
end $$;

-- ── 3) Venda de balcão ──────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"f5000000-0000-4000-8000-000000000001","role":"authenticated"}';

select '3a. Venda registrada' as teste,
  (r.payload ->> 'total')::numeric = 350 as total_ok,
  (r.payload ->> 'paid')::boolean as recebida_ok
from (
  select public.create_counter_sale(
    'b0000000-0000-4000-8000-00000000000a',
    '[{"productId":"b4000000-0000-4000-8000-000000000001","quantity":10}]'::jsonb,
    'b6000000-0000-4000-8000-00000000000a',
    'b2000000-0000-4000-8000-000000000001',
    50,
    'pix'::public.payment_method,
    null
  ) as payload
) r;

select '3b. Baixa e receita' as teste,
  (select on_hand from public.product_stock_balances
    where product_id = 'b4000000-0000-4000-8000-000000000001') = 490 as estoque_ok,
  (select count(*) from public.financial_transactions
    where barbershop_id = 'b0000000-0000-4000-8000-00000000000a'
      and category = 'product' and status = 'paid' and amount = 350) = 1 as receita_ok;

do $$
begin
  begin
    perform public.create_counter_sale(
      'b0000000-0000-4000-8000-00000000000a',
      '[{"productId":"b4000000-0000-4000-8000-000000000001","quantity":999}]'::jsonb,
      null, null, 0, 'cash'::public.payment_method, null);
    raise notice 'ALERTA: venda sem estoque aceita';
  exception when others then
    raise notice '3c. OK: venda sem estoque recusada (%)', sqlerrm;
  end;
  begin
    perform public.create_counter_sale(
      'b0000000-0000-4000-8000-00000000000a',
      '[{"productId":"b4000000-0000-4000-8000-000000000001","quantity":1}]'::jsonb,
      null, null, 999, 'cash'::public.payment_method, null);
    raise notice 'ALERTA: desconto maior que o total aceito';
  exception when others then
    raise notice '3d. OK: desconto maior que o total recusado (%)', sqlerrm;
  end;
end $$;

-- ── 4) Finalizar e receber ──────────────────────────────────────────────────
select '4a. Finalizar e receber' as teste,
  (r.payload ->> 'received')::numeric = 60 as recebido_ok,
  (r.payload ->> 'covered')::boolean = false as sem_plano_ok
from (
  select public.complete_and_receive_appointment(
    'b3000000-0000-4000-8000-000000000001', 'cash'::public.payment_method
  ) as payload
) r;

select '4b. Receita paga na hora' as teste,
  (select status from public.financial_transactions
    where appointment_id = 'b3000000-0000-4000-8000-000000000001'
      and category = 'service') = 'paid' as paga_ok,
  (select payment_method from public.financial_transactions
    where appointment_id = 'b3000000-0000-4000-8000-000000000001'
      and category = 'service') = 'cash' as metodo_ok;
reset role;

-- ── 5) Clientes: planos, segmentos e gasto do assinante ─────────────────────
insert into public.customer_membership_plans (id, barbershop_id, name, price, period) values
  ('b5000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000a', 'Clube Op', 100, 'monthly');
insert into public.membership_entitlements (barbershop_id, plan_id, service_id, uses_per_period) values
  ('b0000000-0000-4000-8000-00000000000a', 'b5000000-0000-4000-8000-000000000001',
   'b1000000-0000-4000-8000-000000000001', 4);

insert into public.customer_memberships
  (id, barbershop_id, client_id, plan_id, status, price, current_period_start, current_period_end)
values
  ('b7000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000a',
   'b6000000-0000-4000-8000-00000000000b', 'b5000000-0000-4000-8000-000000000001',
   'active', 100, now() - interval '10 day', now() + interval '20 day'),
  ('b7000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-00000000000a',
   'b6000000-0000-4000-8000-00000000000c', 'b5000000-0000-4000-8000-000000000001',
   'active', 100, now() - interval '40 day', now() - interval '10 day');

insert into public.membership_payments
  (barbershop_id, membership_id, amount, payment_method, period_start, period_end)
values
  ('b0000000-0000-4000-8000-00000000000a', 'b7000000-0000-4000-8000-000000000001',
   100, 'pix', now() - interval '10 day', now() + interval '20 day');

set local role authenticated;
set local request.jwt.claims to '{"sub":"f5000000-0000-4000-8000-000000000001","role":"authenticated"}';

select '5a. Segmento assinantes' as teste,
  (select count(*) from public.get_client_insights(
    'b0000000-0000-4000-8000-00000000000a', 'assinantes', null, 25, 0, null)) = 2 as assinantes_ok;

select '5b. Segmento inadimplentes' as teste,
  (select count(*) from public.get_client_insights(
    'b0000000-0000-4000-8000-00000000000a', 'inadimplentes', null, 25, 0, null)) = 1 as inadimplentes_ok,
  (select name from public.get_client_insights(
    'b0000000-0000-4000-8000-00000000000a', 'inadimplentes', null, 25, 0, null))
    = 'Cliente Inadimplente' as quem_ok;

-- O assinante aparecia com R$ 0,00: o gasto só somava receita amarrada a
-- agendamento, e o atendimento coberto pelo plano não gera receita.
select '5c. Gasto do assinante' as teste,
  g.total_spent = 100 as gasto_ok,
  g.membership_status = 'active' as situacao_ok,
  g.membership_plan_name = 'Clube Op' as plano_ok
from public.get_client_insights(
  'b0000000-0000-4000-8000-00000000000a', 'todos', null, 1, 0,
  'b6000000-0000-4000-8000-00000000000b') g;

-- Consulta por id devolve o cliente mesmo fora do segmento pedido.
select '5d. Perfil por id' as teste,
  (select count(*) from public.get_client_insights(
    'b0000000-0000-4000-8000-00000000000a', 'assinantes', null, 1, 0,
    'b6000000-0000-4000-8000-00000000000a')) = 1 as perfil_ok;

select '5e. Histórico e pagamentos' as teste,
  (select count(*) from public.get_client_history(
    'b0000000-0000-4000-8000-00000000000a',
    'b6000000-0000-4000-8000-00000000000a', 20, 0)) = 3 as historico_ok,
  (select count(*) from public.get_client_payments(
    'b0000000-0000-4000-8000-00000000000a',
    'b6000000-0000-4000-8000-00000000000a', 20)) >= 2 as pagamentos_ok;

select '5f. Planos precisando de atenção' as teste,
  m.past_due = 1 as vencidos_ok
from public.count_memberships_attention('b0000000-0000-4000-8000-00000000000a', 7) m;

reset role;

rollback;
