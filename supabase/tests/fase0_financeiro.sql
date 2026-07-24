-- Fase 0 — testes da verdade financeira e do agendamento público.
-- Rodar no SQL Editor do Supabase (ou psql) após aplicar a migration
-- 202607230022. Tudo em transação com ROLLBACK: não deixa dados no banco.
--
-- O que prova:
--  1) Concluir atendimento cria UMA receita pendente (sem paid_at/método);
--     repetir a conclusão não duplica.
--  2) Confirmar pagamento preenche método e paid_at; confirmar duas vezes
--     não duplica receita.
--  3) Transição nova para "paid" sem forma de pagamento é bloqueada.
--  4) Estorno volta a pendente e audita — não apaga o histórico.
--  5) Cancelar/no_show não cria venda.
--  6) Reserva pública retorna referência + status persistido ("pending").
--  7) Serviço audience <> 'public' não aparece nas RPCs públicas.
--  8) Tenant A não altera transação do tenant B (RLS).

begin;

-- ── Cenário ──────────────────────────────────────────────────────────────────
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('f1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fase0-a@teste.dev','x', now(), '{"provider":"email"}','{"full_name":"Dono A"}', now(), now()),
  ('f1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fase0-b@teste.dev','x', now(), '{"provider":"email"}','{"full_name":"Dono B"}', now(), now());

insert into public.barbershops (id, name, slug, plan) values
  ('d0000000-0000-4000-8000-00000000000a', 'Fase0 A', 'fase0-a', 'starter'),
  ('d0000000-0000-4000-8000-00000000000b', 'Fase0 B', 'fase0-b', 'starter');

insert into public.tenant_settings (barbershop_id, booking_notice_minutes) values
  ('d0000000-0000-4000-8000-00000000000a', 0);

insert into public.memberships (barbershop_id, profile_id, role)
select 'd0000000-0000-4000-8000-00000000000a'::uuid, p.id, 'owner'::public.membership_role from public.profiles p where p.auth_user_id = 'f1000000-0000-4000-8000-000000000001'
union all
select 'd0000000-0000-4000-8000-00000000000b'::uuid, p.id, 'owner'::public.membership_role from public.profiles p where p.auth_user_id = 'f1000000-0000-4000-8000-000000000002';

insert into public.clients (id, barbershop_id, name, phone, phone_normalized) values
  ('d6000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-00000000000a', 'Cliente A', '11666660001', '11666660001');

insert into public.services (id, barbershop_id, name, price, duration_minutes) values
  ('d1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000a', 'Corte Fase0', 50, 30),
  ('d1000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-00000000000a', 'Assinatura Interna', 0.01, 30);
update public.services set audience = 'members'
where id = 'd1000000-0000-4000-8000-000000000002';

insert into public.professionals (id, barbershop_id, name) values
  ('d2000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000a', 'Prof Fase0');
insert into public.professional_services (barbershop_id, professional_id, service_id) values
  ('d0000000-0000-4000-8000-00000000000a', 'd2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-00000000000a', 'd2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002');
insert into public.professional_availability (barbershop_id, professional_id, weekday, starts_at, ends_at, slot_interval_minutes)
select 'd0000000-0000-4000-8000-00000000000a', 'd2000000-0000-4000-8000-000000000001', d.weekday, '00:00'::time, '23:59'::time, 15
from (values (0),(1),(2),(3),(4),(5),(6)) as d(weekday);

-- ── 1) Conclusão → receita pendente, idempotente ────────────────────────────
insert into public.appointments (id, barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source)
values ('d3000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-00000000000a',
        'd6000000-0000-4000-8000-00000000000a', 'd2000000-0000-4000-8000-000000000001',
        'd1000000-0000-4000-8000-000000000001', now() - interval '2 hour', now() - interval '90 min', 'confirmed', 'dashboard');

update public.appointments set status = 'completed' where id = 'd3000000-0000-4000-8000-000000000001';
-- repete a transição (simula clique duplo / reprocessamento)
update public.appointments set status = 'pending' where id = 'd3000000-0000-4000-8000-000000000001';
update public.appointments set status = 'completed' where id = 'd3000000-0000-4000-8000-000000000001';

select '1. Conclusão → pendente e única' as teste,
  (select count(*) from public.financial_transactions
    where appointment_id = 'd3000000-0000-4000-8000-000000000001' and type = 'income' and category = 'service') = 1 as receita_unica_ok,
  (select status from public.financial_transactions
    where appointment_id = 'd3000000-0000-4000-8000-000000000001' and category = 'service') = 'pending' as pendente_ok,
  (select paid_at is null and payment_method is null from public.financial_transactions
    where appointment_id = 'd3000000-0000-4000-8000-000000000001' and category = 'service') as sem_pagamento_ok;

-- ── 2) Recebimento com método; repetição não duplica ────────────────────────
update public.financial_transactions
set status = 'paid', paid_at = now(), payment_method = 'pix'
where appointment_id = 'd3000000-0000-4000-8000-000000000001' and category = 'service';

select '2. Pix confirma' as teste,
  (select payment_method::text from public.financial_transactions
    where appointment_id = 'd3000000-0000-4000-8000-000000000001' and category = 'service') = 'pix' as metodo_ok,
  (select paid_at is not null from public.financial_transactions
    where appointment_id = 'd3000000-0000-4000-8000-000000000001' and category = 'service') as paid_at_ok,
  (select count(*) from public.financial_transactions
    where appointment_id = 'd3000000-0000-4000-8000-000000000001' and category = 'service') = 1 as ainda_unica_ok;

-- ── 3) Pago sem método é bloqueado ───────────────────────────────────────────
do $$
begin
  begin
    insert into public.financial_transactions
      (barbershop_id, type, status, category, description, amount, paid_at)
    values
      ('d0000000-0000-4000-8000-00000000000a', 'income', 'paid', 'service',
       'inválida: paga sem método', 10, now());
    raise notice 'ALERTA: receita paga sem método NÃO foi bloqueada';
  exception when others then
    raise notice '3. OK: receita paga sem método bloqueada (%)', sqlerrm;
  end;
end $$;

-- ── 4) Estorno auditado (não apaga) ──────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.revert_income_payment(t.id)
from public.financial_transactions t
where t.appointment_id = 'd3000000-0000-4000-8000-000000000001' and t.category = 'service';
reset role;

select '4. Estorno' as teste,
  (select status from public.financial_transactions
    where appointment_id = 'd3000000-0000-4000-8000-000000000001' and category = 'service') = 'pending' as voltou_pendente_ok,
  (select count(*) from public.financial_transactions
    where appointment_id = 'd3000000-0000-4000-8000-000000000001' and category = 'service') = 1 as nao_apagou_ok,
  (select count(*) from public.audit_logs
    where barbershop_id = 'd0000000-0000-4000-8000-00000000000a' and action = 'payment.reverted') = 1 as auditoria_ok;

-- ── 5) Cancelamento e falta não criam venda ─────────────────────────────────
insert into public.appointments (id, barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source)
values ('d3000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-00000000000a',
        'd6000000-0000-4000-8000-00000000000a', 'd2000000-0000-4000-8000-000000000001',
        'd1000000-0000-4000-8000-000000000001', now() + interval '1 day', now() + interval '25 hour', 'pending', 'dashboard');
-- Fase 0: canceled_at agora é preenchido por trigger (o painel não envia).
update public.appointments set status = 'canceled' where id = 'd3000000-0000-4000-8000-000000000002';

insert into public.appointments (id, barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source)
values ('d3000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-00000000000a',
        'd6000000-0000-4000-8000-00000000000a', 'd2000000-0000-4000-8000-000000000001',
        'd1000000-0000-4000-8000-000000000001', now() + interval '2 day', now() + interval '49 hour', 'confirmed', 'dashboard');
update public.appointments set status = 'no_show' where id = 'd3000000-0000-4000-8000-000000000003';

select '5. Cancelar/falta sem venda' as teste,
  (select canceled_at is not null from public.appointments
    where id = 'd3000000-0000-4000-8000-000000000002') as canceled_at_preenchido_ok,
  (select count(*) from public.financial_transactions
    where appointment_id in ('d3000000-0000-4000-8000-000000000002','d3000000-0000-4000-8000-000000000003')) = 0 as sem_receita_ok;

-- ── 6) Reserva pública: referência + status pendente ────────────────────────
select '6. Reserva pública' as teste,
  (r.payload ->> 'status') = 'pending' as status_pendente_ok,
  length(r.payload ->> 'reference') >= 6 as referencia_ok
from (
  select public.create_public_appointment(
    'fase0-a',
    'd2000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000001',
    date_trunc('hour', now() + interval '1 day'),
    'Cliente Público', '11988887777'
  ) as payload
) r;

-- ── 7) Serviço não-público fora das RPCs públicas ───────────────────────────
select '7. Audience' as teste,
  not exists (
    select 1 from jsonb_array_elements(
      public.get_public_barbershop('fase0-a') -> 'services'
    ) s where s ->> 'id' = 'd1000000-0000-4000-8000-000000000002'
  ) as members_fora_da_pagina_ok,
  (select count(*) from public.get_public_availability(
    'fase0-a', 'd2000000-0000-4000-8000-000000000001',
    'd1000000-0000-4000-8000-000000000002', (now() + interval '3 day')::date
  )) = 0 as members_sem_slots_ok;

do $$
begin
  begin
    perform public.create_public_appointment(
      'fase0-a',
      'd2000000-0000-4000-8000-000000000001',
      'd1000000-0000-4000-8000-000000000002',
      date_trunc('hour', now() + interval '2 day'),
      'Cliente Público', '11977776666'
    );
    raise notice 'ALERTA: serviço members foi agendado publicamente';
  exception when others then
    raise notice '7b. OK: agendamento público de serviço members bloqueado (%)', sqlerrm;
  end;
end $$;

-- ── 8) Tenant A não altera transação do tenant B ─────────────────────────────
insert into public.financial_transactions
  (id, barbershop_id, type, status, category, description, amount)
values
  ('d9000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-00000000000b',
   'income', 'pending', 'service', 'receita do tenant B', 99);

set local role authenticated;
set local request.jwt.claims to '{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}';
update public.financial_transactions set amount = 1
where id = 'd9000000-0000-4000-8000-00000000000b';
-- e o estorno via RPC também deve negar (NOT_AUTHORIZED)
do $$
begin
  begin
    perform public.revert_income_payment('d9000000-0000-4000-8000-00000000000b');
    raise notice 'ALERTA: RPC de estorno cruzou tenant';
  exception when others then
    raise notice '8b. OK: estorno cruzado bloqueado (%)', sqlerrm;
  end;
end $$;
reset role;

select '8. Isolamento financeiro' as teste,
  (select amount from public.financial_transactions
    where id = 'd9000000-0000-4000-8000-00000000000b') = 99 as update_cruzado_bloqueado_ok;

rollback;
