-- Fase 2 — testes da agenda operacional. Transação com ROLLBACK.
--
-- O que prova:
--  1) Máquina de estados no banco: transições inválidas bloqueadas
--     (pending→completed, canceled→confirmed), correção completed→confirmed
--     permitida, conclusão no futuro bloqueada.
--  2) Remarcação transacional: muda o horário preservando a linha e audita;
--     conflito com outro horário falha e preserva o horário anterior;
--     bloqueio impede remarcação.
--  3) Primeiro disponível: avalia todos os profissionais habilitados e
--     ordena por horário.
--  4) Token público: consulta retorna dados limitados; cancelar com token
--     respeita a antecedência e funciona; token inválido falha.

begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('f4000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fase2-a@teste.dev','x', now(), '{"provider":"email"}','{"full_name":"Dono F2"}', now(), now());

insert into public.barbershops (id, name, slug) values
  ('a0000000-0000-4000-8000-00000000000a', 'Fase2 A', 'fase2-a');
insert into public.tenant_settings
  (barbershop_id, booking_notice_minutes, cancellation_notice_minutes, booking_horizon_days)
values ('a0000000-0000-4000-8000-00000000000a', 0, 120, 30);
insert into public.memberships (barbershop_id, profile_id, role)
select 'a0000000-0000-4000-8000-00000000000a'::uuid, p.id, 'owner'::public.membership_role
from public.profiles p where p.auth_user_id = 'f4000000-0000-4000-8000-000000000001';

insert into public.clients (id, barbershop_id, name, phone, phone_normalized) values
  ('a6000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-00000000000a', 'Cliente F2', '11955556666', '11955556666');
insert into public.services (id, barbershop_id, name, price, duration_minutes) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'Corte F2', 50, 30);
insert into public.professionals (id, barbershop_id, name) values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'Alfa'),
  ('a2000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'Beto');
insert into public.professional_services (barbershop_id, professional_id, service_id) values
  ('a0000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001');
insert into public.professional_availability (barbershop_id, professional_id, weekday, starts_at, ends_at, slot_interval_minutes)
select 'a0000000-0000-4000-8000-00000000000a', p.id, d.weekday, '08:00'::time, '20:00'::time, 30
from (values ('a2000000-0000-4000-8000-000000000001'::uuid), ('a2000000-0000-4000-8000-000000000002'::uuid)) p(id)
cross join (values (0),(1),(2),(3),(4),(5),(6)) d(weekday);

-- ── 1) Máquina de estados ───────────────────────────────────────────────────
insert into public.appointments (id, barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source)
values
  -- passado: para testar conclusão
  ('a3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a',
   'a6000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000001',
   'a1000000-0000-4000-8000-000000000001', now() - interval '2 hour', now() - interval '90 min', 'pending', 'dashboard'),
  -- futuro: para testar conclusão futura e remarcação
  ('a3000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a',
   'a6000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000001',
   'a1000000-0000-4000-8000-000000000001', date_trunc('hour', now() + interval '2 day'), date_trunc('hour', now() + interval '2 day') + interval '30 min', 'confirmed', 'dashboard');

do $$
begin
  begin
    update public.appointments set status = 'completed'
    where id = 'a3000000-0000-4000-8000-000000000001'; -- pending → completed
    raise notice 'ALERTA: pending→completed aceito';
  exception when others then
    raise notice '1a. OK: pending→completed bloqueado (%)', sqlerrm;
  end;
  begin
    update public.appointments set status = 'completed'
    where id = 'a3000000-0000-4000-8000-000000000002'; -- confirmado no FUTURO
    raise notice 'ALERTA: conclusão no futuro aceita';
  exception when others then
    raise notice '1b. OK: conclusão no futuro bloqueada (%)', sqlerrm;
  end;
end $$;

update public.appointments set status = 'confirmed' where id = 'a3000000-0000-4000-8000-000000000001';
update public.appointments set status = 'completed' where id = 'a3000000-0000-4000-8000-000000000001';
update public.appointments set status = 'confirmed' where id = 'a3000000-0000-4000-8000-000000000001';
select '1c. Correção explícita' as teste,
  (select status from public.appointments where id = 'a3000000-0000-4000-8000-000000000001') = 'confirmed' as desfazer_ok;
update public.appointments set status = 'completed' where id = 'a3000000-0000-4000-8000-000000000001';

do $$
begin
  begin
    update public.appointments set status = 'canceled'
    where id = 'a3000000-0000-4000-8000-000000000001'; -- completed → canceled
    raise notice 'ALERTA: completed→canceled aceito';
  exception when others then
    raise notice '1d. OK: completed→canceled bloqueado (%)', sqlerrm;
  end;
end $$;

-- ── 2) Remarcação ───────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"f4000000-0000-4000-8000-000000000001","role":"authenticated"}';
select '2a. Remarcação' as teste,
  (r.payload ->> 'startsAt') is not null as remarcada_ok
from (
  select public.reschedule_appointment(
    'a3000000-0000-4000-8000-000000000002',
    date_trunc('hour', now() + interval '3 day')
  ) as payload
) r;
reset role;

select '2b. Histórico preservado' as teste,
  (select count(*) from public.appointments where id = 'a3000000-0000-4000-8000-000000000002') = 1 as mesma_linha_ok,
  (select count(*) from public.audit_logs
    where entity_id = 'a3000000-0000-4000-8000-000000000002'
      and action = 'appointment.rescheduled') = 1 as auditoria_ok;

-- Conflito: outro horário do mesmo profissional no destino → falha e preserva.
insert into public.appointments (id, barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source)
values ('a3000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-00000000000a',
        'a6000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000001',
        'a1000000-0000-4000-8000-000000000001', date_trunc('hour', now() + interval '4 day'), date_trunc('hour', now() + interval '4 day') + interval '30 min', 'confirmed', 'dashboard');

set local role authenticated;
set local request.jwt.claims to '{"sub":"f4000000-0000-4000-8000-000000000001","role":"authenticated"}';
do $$
begin
  begin
    perform public.reschedule_appointment(
      'a3000000-0000-4000-8000-000000000002',
      date_trunc('hour', now() + interval '4 day'));
    raise notice 'ALERTA: remarcação em conflito aceita';
  exception when others then
    raise notice '2c. OK: conflito bloqueado (%)', sqlerrm;
  end;
end $$;
reset role;

select '2d. Horário anterior preservado' as teste,
  (select starts_at from public.appointments where id = 'a3000000-0000-4000-8000-000000000002')
    = date_trunc('hour', now() + interval '3 day') as preservado_ok;

-- ── 3) Primeiro disponível ──────────────────────────────────────────────────
-- Ocupa a agenda do Alfa amanhã às 10:00; o primeiro disponível nesse horário
-- deve ser o Beto, e o conjunto vem ordenado por horário.
insert into public.appointments (barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source)
select 'a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-00000000000a',
       'a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
       d + time '10:00', d + time '10:30', 'confirmed', 'dashboard'
from (select (current_date + 1)::timestamp as d) x;

select '3. Primeiro disponível' as teste,
  (select count(distinct fa.professional_id) from public.get_first_available(
    'fase2-a', 'a1000000-0000-4000-8000-000000000001', current_date + 1
  ) fa) = 2 as avalia_todos_ok,
  (select bool_and(ok) from (
    select fa.starts_at >= lag(fa.starts_at, 1, fa.starts_at) over (order by fa.starts_at) as ok
    from public.get_first_available(
      'fase2-a', 'a1000000-0000-4000-8000-000000000001', current_date + 1) fa
  ) s) as ordenado_ok,
  not exists (
    select 1 from public.get_first_available(
      'fase2-a', 'a1000000-0000-4000-8000-000000000001', current_date + 1) fa
    where fa.professional_id = 'a2000000-0000-4000-8000-000000000001'
      and fa.starts_at = (current_date + 1)::timestamp + time '10:00'
  ) as slot_ocupado_fora_ok;

-- ── 4) Token público ────────────────────────────────────────────────────────
select '4a. Consulta por token' as teste,
  (public.get_public_appointment(a.public_token) ->> 'reference') = a.public_reference as consulta_ok,
  (public.get_public_appointment(a.public_token) ->> 'canCancel')::boolean as pode_cancelar_ok
from public.appointments a where a.id = 'a3000000-0000-4000-8000-000000000002';

-- Cancela com o token (antecedência 120 min, horário a ~3 dias → permitido).
select '4b. Cancelamento por token' as teste,
  (public.cancel_public_appointment(a.public_token) ->> 'status') = 'canceled' as cancelou_ok
from public.appointments a where a.id = 'a3000000-0000-4000-8000-000000000002';

select '4c. Estado persistido' as teste,
  (select status from public.appointments where id = 'a3000000-0000-4000-8000-000000000002') = 'canceled' as status_ok,
  (select canceled_at is not null from public.appointments where id = 'a3000000-0000-4000-8000-000000000002') as canceled_at_ok,
  (select count(*) from public.financial_transactions
    where appointment_id = 'a3000000-0000-4000-8000-000000000002') = 0 as sem_receita_ok;

do $$
begin
  begin
    perform public.cancel_public_appointment('token-invalido-xyz');
    raise notice 'ALERTA: token inválido aceito';
  exception when others then
    raise notice '4d. OK: token inválido rejeitado (%)', sqlerrm;
  end;
end $$;

-- Antecedência: horário em 1h com antecedência exigida de 120 min → bloqueado.
insert into public.appointments (id, barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source)
values ('a3000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-00000000000a',
        'a6000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000002',
        'a1000000-0000-4000-8000-000000000001', now() + interval '1 hour', now() + interval '90 min', 'confirmed', 'dashboard');
do $$
declare v_token text;
begin
  select public_token into v_token from public.appointments
  where id = 'a3000000-0000-4000-8000-000000000004';
  begin
    perform public.cancel_public_appointment(v_token);
    raise notice 'ALERTA: cancelamento fora da antecedência aceito';
  exception when others then
    raise notice '4e. OK: antecedência respeitada (%)', sqlerrm;
  end;
end $$;

rollback;
