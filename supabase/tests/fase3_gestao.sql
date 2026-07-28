-- Fase 3 — Gestão. Transação com ROLLBACK.
--
-- O que prova:
--  1) commission_summary: total produzido (serviços + produtos), precedência
--     da taxa do SERVIÇO sobre a do PROFISSIONAL, vale e pagamento abatidos,
--     valor a pagar calculado e nunca negativo. Modelo fixo/híbrido somam
--     salário; profissional sem regra cai em comissão zero.
--  2) income_summary: comissão apurada por competência e lucro depois dela,
--     devolvendo a comissão JÁ PAGA no período (senão a equipe seria
--     descontada duas vezes). As colunas antigas mantêm o significado.
--  3) cash_flow_series: soma recebido e despesa por bucket, no fuso do
--     tenant.
--  4) appointment_heatmap: agrega por dia da semana e hora locais, contando
--     só concluído/confirmado.
--  5) team_invites: um convite PENDENTE por e-mail e barbearia; convite
--     revogado não bloqueia um novo.
--  6) Isolamento entre tenants nas três funções novas.

begin;

insert into public.barbershops (id, name, slug) values
  ('90000000-0000-4000-8000-00000000000a', 'F3G A', 'f3g-a'),
  ('90000000-0000-4000-8000-00000000000b', 'F3G B', 'f3g-b');

-- Serviço com comissão própria (30%) e serviço sem comissão (usa a do
-- profissional).
insert into public.services (id, barbershop_id, name, price, duration_minutes, commission_rate) values
  ('91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-00000000000a', 'Corte', 100, 30, 30),
  ('91000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-00000000000a', 'Barba', 50, 20, 0);

insert into public.clients (id, barbershop_id, name, phone, phone_normalized) values
  ('95000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-00000000000a', 'Cliente F3G', '11922220001', '11922220001');

insert into public.professionals (id, barbershop_id, name) values
  -- Bruno: comissão padrão 10%, modelo comissão.
  ('92000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-00000000000a', 'Bruno'),
  -- Carla: híbrido, salário 500 + comissão padrão 20%.
  ('92000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-00000000000a', 'Carla'),
  -- Davi: sem regra de pagamento cadastrada.
  ('92000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-00000000000a', 'Davi');

insert into public.employee_pay_settings
  (barbershop_id, professional_id, model, base_salary, commission_rate, payment_period)
values
  ('90000000-0000-4000-8000-00000000000a', '92000000-0000-4000-8000-000000000001', 'commission', 0, 10, 'monthly'),
  ('90000000-0000-4000-8000-00000000000a', '92000000-0000-4000-8000-000000000002', 'hybrid', 500, 20, 'monthly');

-- Bruno: 1 Corte (100 × 30% do serviço = 30) + 1 Barba (50 × 10% dele = 5).
--        Produzido em serviços = 150, comissão = 35.
insert into public.appointments
  (id, barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source)
values
  ('93000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-00000000000a',
   '95000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001',
   now() - interval '2 days', now() - interval '2 days' + interval '30 min', 'completed', 'dashboard'),
  ('93000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-00000000000a',
   '95000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000002',
   now() - interval '1 day', now() - interval '1 day' + interval '20 min', 'completed', 'dashboard'),
  -- Carla: 1 Barba (50 × 20% dela = 10).
  ('93000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-00000000000a',
   '95000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000002',
   now() - interval '1 day', now() - interval '1 day' + interval '20 min', 'completed', 'dashboard'),
  -- Cancelado do Bruno: não pode entrar em nada.
  ('93000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-00000000000a',
   '95000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001',
   now() - interval '1 day', now() - interval '1 day' + interval '30 min', 'canceled', 'dashboard');

-- Produto confirmado atribuído ao Bruno: 2 × 20 = 40 produzidos em produto
-- (produto não gera comissão pela regra vigente).
insert into public.products (id, barbershop_id, name, sale_price)
values ('94000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-00000000000a', 'Pomada', 20);
insert into public.appointment_products
  (barbershop_id, appointment_id, product_id, quantity, unit_price, status, confirmed_at)
values
  ('90000000-0000-4000-8000-00000000000a', '93000000-0000-4000-8000-000000000001',
   '94000000-0000-4000-8000-000000000001', 2, 20, 'confirmed', now() - interval '2 days');

-- Vale de 10 para o Bruno e pagamento de 5 já feito.
insert into public.employee_advances
  (barbershop_id, professional_id, amount, reference_date)
values
  ('90000000-0000-4000-8000-00000000000a', '92000000-0000-4000-8000-000000000001',
   10, (now() - interval '1 day')::date);
insert into public.employee_payments
  (barbershop_id, professional_id, amount, paid_at)
values
  ('90000000-0000-4000-8000-00000000000a', '92000000-0000-4000-8000-000000000001',
   5, now() - interval '1 day');

-- 1. Fechamento do Bruno.
select 'Fechamento por profissional (comissão)' as teste,
  cs.completed_count = 2 as atendimentos_ok,
  cs.produced_services = 150 as produzido_servicos_ok,
  cs.produced_products = 40 as produzido_produtos_ok,
  cs.produced_total = 190 as produzido_total_ok,
  -- 100 × 30% (taxa do SERVIÇO) + 50 × 10% (taxa do PROFISSIONAL)
  cs.commission = 35 as precedencia_da_taxa_ok,
  cs.advances = 10 as vale_ok,
  cs.paid = 5 as pago_ok,
  -- 35 de comissão − 10 de vale − 5 já pago
  cs.to_pay = 20 as valor_a_pagar_calculado_ok
from public.commission_summary(
  '90000000-0000-4000-8000-00000000000a',
  now() - interval '7 days', now() + interval '1 day') cs
where cs.professional_id = '92000000-0000-4000-8000-000000000001';

-- 2. Modelo híbrido soma salário; profissional sem regra fica em zero.
select 'Modelos de pagamento' as teste,
  (select cs.to_pay = 510 from public.commission_summary(
     '90000000-0000-4000-8000-00000000000a',
     now() - interval '7 days', now() + interval '1 day') cs
   where cs.professional_id = '92000000-0000-4000-8000-000000000002') as hibrido_soma_salario_ok,
  (select cs.to_pay = 0 and cs.model = 'commission'
   from public.commission_summary(
     '90000000-0000-4000-8000-00000000000a',
     now() - interval '7 days', now() + interval '1 day') cs
   where cs.professional_id = '92000000-0000-4000-8000-000000000003') as sem_regra_zera_ok;

-- 3. Vale maior que a produção não gera valor a pagar negativo.
insert into public.employee_advances
  (barbershop_id, professional_id, amount, reference_date)
values
  ('90000000-0000-4000-8000-00000000000a', '92000000-0000-4000-8000-000000000003',
   999, (now() - interval '1 day')::date);

select 'Vale acima da produção não vira valor negativo' as teste,
  cs.advances = 999 as vale_registrado_ok,
  cs.to_pay = 0 as nao_negativo_ok
from public.commission_summary(
  '90000000-0000-4000-8000-00000000000a',
  now() - interval '7 days', now() + interval '1 day') cs
where cs.professional_id = '92000000-0000-4000-8000-000000000003';

-- 4. Resumo financeiro: lucro de caixa × lucro depois da comissão.
--    Recebido 300; despesas pagas = 100 (aluguel) + 5 (pagamento da equipe).
--    Comissão apurada total = 35 (Bruno) + 10 (Carla) = 45.
--    profit               = 300 − 105 = 195
--    profit_after_commiss = 300 − 105 + 5 (devolve o salário pago) − 45 = 155
insert into public.financial_transactions
  (barbershop_id, type, status, category, description, amount, paid_at, payment_method)
values
  ('90000000-0000-4000-8000-00000000000a', 'income', 'paid', 'service', 'r1', 300, now() - interval '1 day', 'pix'),
  ('90000000-0000-4000-8000-00000000000a', 'expense', 'paid', 'conta_a_pagar', 'aluguel', 100, now() - interval '1 day', null),
  ('90000000-0000-4000-8000-00000000000a', 'expense', 'paid', 'salary', 'Pagamento — Bruno', 5, now() - interval '1 day', null);

select 'Lucro que desconta comissão' as teste,
  s.received = 300 as recebido_ok,
  s.expenses_paid = 105 as despesas_ok,
  s.profit = 195 as lucro_caixa_preservado_ok,
  s.commissions_accrued = 45 as comissao_apurada_ok,
  s.profit_after_commissions = 155 as lucro_pos_comissao_ok
from public.income_summary(
  '90000000-0000-4000-8000-00000000000a',
  now() - interval '7 days', now() + interval '1 day') s;

-- 5. Série do gráfico: um bucket por dia, com recebido e despesa separados.
select 'Série do gráfico agregada no banco' as teste,
  count(*) = 1 as um_bucket_ok,
  sum(received) = 300 as recebido_ok,
  sum(expenses) = 105 as despesas_ok
from public.cash_flow_series(
  '90000000-0000-4000-8000-00000000000a',
  now() - interval '7 days', now() + interval '1 day',
  'America/Sao_Paulo', 'day');

-- 6. Mapa de calor: 3 concluídos entram, o cancelado não.
select 'Mapa de calor ignora cancelado' as teste,
  coalesce(sum(appointments), 0) = 3 as total_ok,
  coalesce(sum(revenue), 0) = 200 as receita_ok
from public.appointment_heatmap(
  '90000000-0000-4000-8000-00000000000a',
  now() - interval '7 days', now() + interval '1 day',
  'America/Sao_Paulo');

-- 7. Convite: um pendente por e-mail e barbearia.
insert into public.team_invites (barbershop_id, email, name, role)
values ('90000000-0000-4000-8000-00000000000a', 'novo@teste.dev', 'Novo', 'professional');

do $$
declare
  v_bloqueou boolean := false;
begin
  begin
    insert into public.team_invites (barbershop_id, email, name, role)
    values ('90000000-0000-4000-8000-00000000000a', 'NOVO@teste.dev', 'Novo 2', 'professional');
  exception when unique_violation then
    v_bloqueou := true;
  end;
  raise notice 'Convite pendente duplicado bloqueado: %', v_bloqueou;
  if not v_bloqueou then
    raise exception 'FALHA: dois convites pendentes para o mesmo e-mail';
  end if;
end
$$;

-- Revogado libera um novo convite para o mesmo e-mail.
update public.team_invites set status = 'revoked'
where barbershop_id = '90000000-0000-4000-8000-00000000000a'
  and lower(email) = 'novo@teste.dev';
insert into public.team_invites (barbershop_id, email, name, role)
values ('90000000-0000-4000-8000-00000000000a', 'novo@teste.dev', 'Novo 3', 'professional');

select 'Convite revogado não bloqueia um novo' as teste,
  count(*) filter (where status = 'pending') = 1 as um_pendente_ok,
  count(*) filter (where status = 'revoked') = 1 as um_revogado_ok
from public.team_invites
where barbershop_id = '90000000-0000-4000-8000-00000000000a';

-- 8. Isolamento entre tenants: a barbearia B não vê nada da A.
select 'Isolamento entre barbearias' as teste,
  (select count(*) from public.commission_summary(
     '90000000-0000-4000-8000-00000000000b',
     now() - interval '7 days', now() + interval '1 day')) = 0 as comissao_isolada_ok,
  (select coalesce(sum(received), 0) from public.cash_flow_series(
     '90000000-0000-4000-8000-00000000000b',
     now() - interval '7 days', now() + interval '1 day',
     'America/Sao_Paulo', 'day')) = 0 as serie_isolada_ok,
  (select coalesce(sum(appointments), 0) from public.appointment_heatmap(
     '90000000-0000-4000-8000-00000000000b',
     now() - interval '7 days', now() + interval '1 day',
     'America/Sao_Paulo')) = 0 as mapa_isolado_ok;

rollback;
