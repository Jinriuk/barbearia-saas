-- Fase 4B — planos vendidos aos clientes. Transação com ROLLBACK.
--
-- O que prova:
--  1) Venda cria contrato + pagamento + receita paga (categoria membership).
--  2) Cliente não acumula dois planos em aberto.
--  3) Conclusão de serviço coberto consome uso e NÃO gera receita nova;
--     dentro do limite consome de novo; esgotado o limite volta a gerar
--     receita pendente normal.
--  4) Desfazer a conclusão devolve o uso consumido.
--  5) Plano vencido ou pausado não aplica benefício (receita normal).
--  6) Renovação antes do vencimento estende a partir do fim vigente e gera
--     nova receita paga; contrato volta a cobrir o serviço.
--  7) Serviço fora do plano gera receita normal.
--  8) Papel de outro tenant não vende nem enxerga o overview.

begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('fb000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','f4b-a@teste.dev','x', now(), '{"provider":"email"}','{"full_name":"Dono F4B"}', now(), now()),
  ('fb000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','f4b-b@teste.dev','x', now(), '{"provider":"email"}','{"full_name":"Dono F4B B"}', now(), now());

insert into public.barbershops (id, name, slug) values
  ('90000000-0000-4000-8000-00000000000a', 'F4B A', 'f4b-a'),
  ('90000000-0000-4000-8000-00000000000b', 'F4B B', 'f4b-b');
insert into public.memberships (barbershop_id, profile_id, role)
select '90000000-0000-4000-8000-00000000000a'::uuid, p.id, 'owner'::public.membership_role
from public.profiles p where p.auth_user_id = 'fb000000-0000-4000-8000-000000000001'
union all
select '90000000-0000-4000-8000-00000000000b'::uuid, p.id, 'owner'::public.membership_role
from public.profiles p where p.auth_user_id = 'fb000000-0000-4000-8000-000000000002';

insert into public.services (id, barbershop_id, name, price, duration_minutes) values
  ('91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-00000000000a', 'Corte Clube', 50, 30),
  ('91000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-00000000000a', 'Barba Avulsa', 40, 30);
insert into public.professionals (id, barbershop_id, name) values
  ('92000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-00000000000a', 'Prof F4B');
insert into public.clients (id, barbershop_id, name, phone, phone_normalized) values
  ('96000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-00000000000a', 'Assinante Um', '11922220001', '11922220001'),
  ('96000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-00000000000a', 'Avulso Dois', '11922220002', '11922220002');

-- Plano mensal: 2 cortes por período.
insert into public.customer_membership_plans (id, barbershop_id, name, price, period) values
  ('93000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-00000000000a', 'Clube Corte', 89.90, 'monthly');
insert into public.membership_entitlements (barbershop_id, plan_id, service_id, uses_per_period) values
  ('90000000-0000-4000-8000-00000000000a', '93000000-0000-4000-8000-000000000001',
   '91000000-0000-4000-8000-000000000001', 2);

-- ── 1. Venda (como dono do tenant A) ─────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"fb000000-0000-4000-8000-000000000001","role":"authenticated"}';

select public.sell_customer_membership(
  '96000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000001',
  'pix'::public.payment_method) as venda_1;

reset role;

select 'Venda cria contrato + pagamento + receita paga' as teste,
  (select count(*) from public.customer_memberships
    where client_id = '96000000-0000-4000-8000-000000000001'
      and status = 'active') = 1 as contrato_ok,
  (select count(*) from public.membership_payments mp
    join public.customer_memberships m on m.id = mp.membership_id
    where m.client_id = '96000000-0000-4000-8000-000000000001') = 1 as pagamento_ok,
  (select count(*) from public.financial_transactions
    where barbershop_id = '90000000-0000-4000-8000-00000000000a'
      and category = 'membership' and status = 'paid'
      and amount = 89.90 and payment_method = 'pix') = 1 as receita_ok,
  (select current_period_end > now() + interval '27 days'
     from public.customer_memberships
     where client_id = '96000000-0000-4000-8000-000000000001') as vigencia_ok;

-- ── 2. Segunda venda ao mesmo cliente é bloqueada ────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"fb000000-0000-4000-8000-000000000001","role":"authenticated"}';
do $$
begin
  perform public.sell_customer_membership(
    '96000000-0000-4000-8000-000000000001',
    '93000000-0000-4000-8000-000000000001',
    'cash'::public.payment_method);
  raise exception 'FALHOU: venda duplicada deveria ser bloqueada';
exception when others then
  if sqlerrm <> 'MEMBERSHIP_ALREADY_ACTIVE' then raise; end if;
end $$;
reset role;
select 'Venda duplicada bloqueada' as teste, true as ok;

-- ── 3. Conclusão coberta consome uso e não gera receita ──────────────────────
insert into public.appointments (id, barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source) values
  ('97000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-00000000000a',
   '96000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001',
   '91000000-0000-4000-8000-000000000001',
   now() - interval '2 hours', now() - interval '90 minutes', 'confirmed', 'dashboard'),
  ('97000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-00000000000a',
   '96000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001',
   '91000000-0000-4000-8000-000000000001',
   now() - interval '80 minutes', now() - interval '50 minutes', 'confirmed', 'dashboard'),
  ('97000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-00000000000a',
   '96000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001',
   '91000000-0000-4000-8000-000000000001',
   now() - interval '45 minutes', now() - interval '15 minutes', 'confirmed', 'dashboard');

update public.appointments set status = 'completed'
where id = '97000000-0000-4000-8000-000000000001';

select 'Conclusão coberta: uso consumido, sem receita nova' as teste,
  (select count(*) from public.membership_usage
    where appointment_id = '97000000-0000-4000-8000-000000000001') = 1 as uso_ok,
  (select count(*) from public.financial_transactions
    where appointment_id = '97000000-0000-4000-8000-000000000001') = 0 as sem_receita_ok;

-- ── 4. Desfazer conclusão devolve o uso ──────────────────────────────────────
update public.appointments set status = 'confirmed'
where id = '97000000-0000-4000-8000-000000000001';
select 'Desfazer conclusão devolve o uso' as teste,
  (select count(*) from public.membership_usage
    where appointment_id = '97000000-0000-4000-8000-000000000001') = 0 as devolvido_ok;
update public.appointments set status = 'completed'
where id = '97000000-0000-4000-8000-000000000001';

-- ── 5. Limite: 2º uso ainda coberto; 3º gera receita pendente ────────────────
update public.appointments set status = 'completed'
where id = '97000000-0000-4000-8000-000000000002';
update public.appointments set status = 'completed'
where id = '97000000-0000-4000-8000-000000000003';

select 'Limite de usos do período' as teste,
  (select count(*) from public.membership_usage u
    join public.customer_memberships m on m.id = u.membership_id
    where m.client_id = '96000000-0000-4000-8000-000000000001') = 2 as dois_usos_ok,
  (select count(*) from public.financial_transactions
    where appointment_id = '97000000-0000-4000-8000-000000000003'
      and status = 'pending' and category = 'service') = 1 as excedente_cobrado_ok;

-- ── 6. Serviço fora do plano gera receita normal ─────────────────────────────
insert into public.appointments (id, barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source) values
  ('97000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-00000000000a',
   '96000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001',
   '91000000-0000-4000-8000-000000000002',
   now() - interval '10 minutes', now() + interval '20 minutes', 'confirmed', 'dashboard');
update public.appointments set status = 'completed'
where id = '97000000-0000-4000-8000-000000000004';
select 'Serviço fora do plano cobra normal' as teste,
  (select count(*) from public.financial_transactions
    where appointment_id = '97000000-0000-4000-8000-000000000004'
      and status = 'pending' and amount = 40) = 1 as cobrado_ok;

-- ── 7. Plano vencido não cobre (usa cliente com período no passado) ──────────
update public.customer_memberships
set current_period_start = now() - interval '2 months',
    current_period_end = now() - interval '1 month'
where client_id = '96000000-0000-4000-8000-000000000001';
-- Mantém o ledger coerente com o período retrocedido (no mundo real venda e
-- renovação acontecem em transações distintas, com now() diferentes).
update public.membership_payments mp
set period_start = now() - interval '2 months',
    period_end = now() - interval '1 month'
from public.customer_memberships m
where m.id = mp.membership_id
  and m.client_id = '96000000-0000-4000-8000-000000000001';
delete from public.membership_usage; -- zera usos para isolar o caso

insert into public.appointments (id, barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source) values
  ('97000000-0000-4000-8000-000000000005', '90000000-0000-4000-8000-00000000000a',
   '96000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001',
   '91000000-0000-4000-8000-000000000001',
   now() - interval '3 hours', now() - interval '150 minutes', 'confirmed', 'dashboard');
update public.appointments set status = 'completed'
where id = '97000000-0000-4000-8000-000000000005';

select 'Plano vencido não aplica benefício' as teste,
  (select count(*) from public.membership_usage
    where appointment_id = '97000000-0000-4000-8000-000000000005') = 0 as sem_uso_ok,
  (select count(*) from public.financial_transactions
    where appointment_id = '97000000-0000-4000-8000-000000000005'
      and status = 'pending') = 1 as cobrado_ok;

-- ── 8. Renovação: volta a cobrir e estende vigência ──────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"fb000000-0000-4000-8000-000000000001","role":"authenticated"}';

select 'Overview marca vencido' as teste,
  (select o.effective_status from public.get_membership_overview(
     '90000000-0000-4000-8000-00000000000a') o limit 1) = 'past_due' as vencido_ok;

select public.renew_customer_membership(
  (select id from public.customer_memberships
   where client_id = '96000000-0000-4000-8000-000000000001'),
  'card'::public.payment_method) as renovacao;

select 'Renovação reativa e estende' as teste,
  (select o.effective_status from public.get_membership_overview(
     '90000000-0000-4000-8000-00000000000a') o limit 1) = 'active' as ativo_ok,
  (select count(*) from public.financial_transactions
    where barbershop_id = '90000000-0000-4000-8000-00000000000a'
      and category = 'membership' and status = 'paid') = 2 as segunda_receita_ok,
  (select current_period_end > now() + interval '27 days'
     from public.customer_memberships
     where client_id = '96000000-0000-4000-8000-000000000001') as vigencia_ok;

-- Renovação antecipada estende a partir do fim vigente (não de agora).
select public.renew_customer_membership(
  (select id from public.customer_memberships
   where client_id = '96000000-0000-4000-8000-000000000001'),
  'card'::public.payment_method) as renovacao_antecipada;
select 'Renovação antecipada estende do fim vigente' as teste,
  (select current_period_end > now() + interval '55 days'
     from public.customer_memberships
     where client_id = '96000000-0000-4000-8000-000000000001') as estendeu_ok;

-- ── 9. Pausa suspende o benefício; retomada devolve ──────────────────────────
select public.set_customer_membership_status(
  (select id from public.customer_memberships
   where client_id = '96000000-0000-4000-8000-000000000001'), 'pause');
reset role;

insert into public.appointments (id, barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source) values
  ('97000000-0000-4000-8000-000000000006', '90000000-0000-4000-8000-00000000000a',
   '96000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001',
   '91000000-0000-4000-8000-000000000001',
   now() - interval '4 hours', now() - interval '210 minutes', 'confirmed', 'dashboard');
update public.appointments set status = 'completed'
where id = '97000000-0000-4000-8000-000000000006';

select 'Pausa suspende o benefício' as teste,
  (select count(*) from public.membership_usage
    where appointment_id = '97000000-0000-4000-8000-000000000006') = 0 as sem_uso_ok,
  (select count(*) from public.financial_transactions
    where appointment_id = '97000000-0000-4000-8000-000000000006') = 1 as cobrado_ok;

-- ── 10. Cancelamento é final e libera nova venda ─────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"fb000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_customer_membership_status(
  (select id from public.customer_memberships
   where client_id = '96000000-0000-4000-8000-000000000001'), 'cancel');
do $$
begin
  perform public.set_customer_membership_status(
    (select id from public.customer_memberships
     where client_id = '96000000-0000-4000-8000-000000000001'), 'resume');
  raise exception 'FALHOU: retomar contrato cancelado deveria falhar';
exception when others then
  if sqlerrm <> 'MEMBERSHIP_CANCELED' then raise; end if;
end $$;
select public.sell_customer_membership(
  '96000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000001',
  'cash'::public.payment_method) as nova_venda_apos_cancelamento;
reset role;
select 'Cancelamento final + recontratação' as teste,
  (select count(*) from public.customer_memberships
    where client_id = '96000000-0000-4000-8000-000000000001'
      and status = 'canceled') = 1 as cancelado_ok,
  (select count(*) from public.customer_memberships
    where client_id = '96000000-0000-4000-8000-000000000001'
      and status = 'active') = 1 as recontratado_ok;

-- ── 11. Isolamento: dono do tenant B não vende nem lista no tenant A ─────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"fb000000-0000-4000-8000-000000000002","role":"authenticated"}';
do $$
begin
  perform public.sell_customer_membership(
    '96000000-0000-4000-8000-000000000002',
    '93000000-0000-4000-8000-000000000001',
    'pix'::public.payment_method);
  raise exception 'FALHOU: venda cruzada deveria ser bloqueada';
exception when others then
  if sqlerrm <> 'NOT_AUTHORIZED' then raise; end if;
end $$;
do $$
begin
  perform * from public.get_membership_overview('90000000-0000-4000-8000-00000000000a');
  raise exception 'FALHOU: overview cruzado deveria ser bloqueado';
exception when others then
  if sqlerrm <> 'NOT_AUTHORIZED' then raise; end if;
end $$;
select 'Isolamento entre tenants' as teste,
  (select count(*) from public.customer_membership_plans) = 0 as rls_planos_ok;
reset role;

rollback;
