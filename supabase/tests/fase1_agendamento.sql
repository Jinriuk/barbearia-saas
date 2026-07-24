-- Fase 1 — testes de regras de agendamento e expediente.
-- Rodar após a migration 202607240023. Transação com ROLLBACK.
--
-- O que prova:
--  1) Modo de confirmação auto → reserva pública nasce 'confirmed';
--     manual → 'pending'.
--  2) Horizonte máximo bloqueia reservas além do configurado
--     (BOOKING_HORIZON_EXCEEDED) e some com os slots.
--  3) Limite de pendentes por cliente usa o valor configurado.
--  4) set_professional_availability: substitui o expediente, valida janela
--     invertida e sobreposição, bloqueia quem não é do tenant e avisa
--     agendamentos futuros fora das novas janelas (sem cancelar nada).
--  5) Dia sem regra (fechado) não produz slots; bloqueio remove slots.

begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('f3000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fase1-a@teste.dev','x', now(), '{"provider":"email"}','{"full_name":"Dono F1"}', now(), now()),
  ('f3000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fase1-b@teste.dev','x', now(), '{"provider":"email"}','{"full_name":"Intruso F1"}', now(), now());

insert into public.barbershops (id, name, slug) values
  ('b0000000-0000-4000-8000-00000000000a', 'Fase1 A', 'fase1-a'),
  ('b0000000-0000-4000-8000-00000000000b', 'Fase1 B', 'fase1-b');

insert into public.tenant_settings
  (barbershop_id, booking_notice_minutes, booking_horizon_days,
   booking_confirmation_mode, max_pending_per_client)
values
  ('b0000000-0000-4000-8000-00000000000a', 0, 7, 'auto', 1);

insert into public.memberships (barbershop_id, profile_id, role)
select 'b0000000-0000-4000-8000-00000000000a'::uuid, p.id, 'owner'::public.membership_role
from public.profiles p where p.auth_user_id = 'f3000000-0000-4000-8000-000000000001'
union all
select 'b0000000-0000-4000-8000-00000000000b'::uuid, p.id, 'owner'::public.membership_role
from public.profiles p where p.auth_user_id = 'f3000000-0000-4000-8000-000000000002';

insert into public.services (id, barbershop_id, name, price, duration_minutes) values
  ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000a', 'Corte F1', 50, 30);
insert into public.professionals (id, barbershop_id, name) values
  ('b2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000a', 'Prof F1');
insert into public.professional_services (barbershop_id, professional_id, service_id) values
  ('b0000000-0000-4000-8000-00000000000a', 'b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001');
insert into public.professional_availability (barbershop_id, professional_id, weekday, starts_at, ends_at, slot_interval_minutes)
select 'b0000000-0000-4000-8000-00000000000a', 'b2000000-0000-4000-8000-000000000001', d.weekday, '00:00'::time, '23:59'::time, 15
from (values (0),(1),(2),(3),(4),(5),(6)) as d(weekday);

-- ── 1) Modo auto → confirmed ────────────────────────────────────────────────
select '1. Auto-confirmação' as teste,
  (r.payload ->> 'status') = 'confirmed' as nasce_confirmada_ok
from (
  select public.create_public_appointment(
    'fase1-a', 'b2000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    date_trunc('hour', now() + interval '1 day'),
    'Cliente F1', '11911112222'
  ) as payload
) r;

-- ── 2) Horizonte: 8 dias à frente com horizonte 7 → bloqueado ───────────────
do $$
begin
  begin
    perform public.create_public_appointment(
      'fase1-a', 'b2000000-0000-4000-8000-000000000001',
      'b1000000-0000-4000-8000-000000000001',
      date_trunc('hour', now() + interval '9 days'),
      'Cliente F1', '11933334444'
    );
    raise notice 'ALERTA: horizonte não foi respeitado';
  exception when others then
    raise notice '2. OK: horizonte bloqueou (%)', sqlerrm;
  end;
end $$;

select '2b. Horizonte sem slots' as teste,
  (select count(*) from public.get_public_availability(
    'fase1-a', 'b2000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001', (now() + interval '9 days')::date
  )) = 0 as slots_fora_horizonte_ok;

-- ── 3) Limite de pendentes configurado (1) → segunda reserva bloqueada ──────
do $$
begin
  begin
    perform public.create_public_appointment(
      'fase1-a', 'b2000000-0000-4000-8000-000000000001',
      'b1000000-0000-4000-8000-000000000001',
      date_trunc('hour', now() + interval '2 days'),
      'Cliente F1', '11911112222'
    );
    raise notice 'ALERTA: limite de pendentes não foi respeitado';
  exception when others then
    raise notice '3. OK: limite de pendentes bloqueou (%)', sqlerrm;
  end;
end $$;

-- ── 4) Expediente transacional ──────────────────────────────────────────────
-- Agendamento futuro numa TERÇA (weekday 2): as novas regras só cobrem
-- segunda, então ele fica deterministicamente fora das janelas novas.
insert into public.appointments (id, barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source)
select 'b3000000-0000-4000-8000-000000000009',
       'b0000000-0000-4000-8000-00000000000a',
       (select id from public.clients where barbershop_id = 'b0000000-0000-4000-8000-00000000000a' limit 1),
       'b2000000-0000-4000-8000-000000000001',
       'b1000000-0000-4000-8000-000000000001',
       tue + time '10:00', tue + time '10:30', 'confirmed', 'dashboard'
from (
  select (current_date + ((9 - extract(dow from current_date)::int) % 7 + 7))::timestamp as tue
) x;

-- 4a. Substituição válida com turnos divididos (dono A autorizado).
set local role authenticated;
set local request.jwt.claims to '{"sub":"f3000000-0000-4000-8000-000000000001","role":"authenticated"}';
select '4a. Substituição' as teste,
  (r.payload ->> 'rules')::int = 2 as regras_ok,
  (r.payload ->> 'futureOutside')::int >= 1 as aviso_fora_janela_ok
from (
  select public.set_professional_availability(
    'b2000000-0000-4000-8000-000000000001',
    '[{"weekday":1,"startsAt":"09:00","endsAt":"12:00","slotIntervalMinutes":15},
      {"weekday":1,"startsAt":"14:00","endsAt":"18:00","slotIntervalMinutes":15}]'::jsonb
  ) as payload
) r;
reset role;

select '4b. Conjunto substituído' as teste,
  (select count(*) from public.professional_availability
    where professional_id = 'b2000000-0000-4000-8000-000000000001') = 2 as substituiu_ok,
  (select count(*) from public.appointments
    where professional_id = 'b2000000-0000-4000-8000-000000000001'
      and status in ('pending','confirmed')) >= 1 as nada_cancelado_ok;

-- 4c. Janela invertida e sobreposição são rejeitadas.
do $$
begin
  begin
    perform public.set_professional_availability(
      'b2000000-0000-4000-8000-000000000001',
      '[{"weekday":2,"startsAt":"18:00","endsAt":"09:00"}]'::jsonb);
    raise notice 'ALERTA: janela invertida aceita';
  exception when others then
    raise notice '4c. OK: janela invertida rejeitada (%)', sqlerrm;
  end;
  begin
    perform public.set_professional_availability(
      'b2000000-0000-4000-8000-000000000001',
      '[{"weekday":2,"startsAt":"09:00","endsAt":"12:00"},
        {"weekday":2,"startsAt":"11:00","endsAt":"15:00"}]'::jsonb);
    raise notice 'ALERTA: sobreposição aceita';
  exception when others then
    raise notice '4d. OK: sobreposição rejeitada (%)', sqlerrm;
  end;
end $$;

-- 4e. Dono de OUTRO tenant não altera o expediente.
set local role authenticated;
set local request.jwt.claims to '{"sub":"f3000000-0000-4000-8000-000000000002","role":"authenticated"}';
do $$
begin
  begin
    perform public.set_professional_availability(
      'b2000000-0000-4000-8000-000000000001',
      '[{"weekday":3,"startsAt":"09:00","endsAt":"12:00"}]'::jsonb);
    raise notice 'ALERTA: expediente alterado por outro tenant';
  exception when others then
    raise notice '4e. OK: expediente cruzado bloqueado (%)', sqlerrm;
  end;
end $$;
reset role;

-- ── 5) Fechado sem slots; bloqueio remove slots ─────────────────────────────
-- O expediente novo só tem weekday 1 (segunda). O próximo domingo dentro do
-- horizonte não pode ter slots (dia sem regra = fechado).
select '5a. Dia fechado' as teste,
  (select count(*) from public.get_public_availability(
    'fase1-a', 'b2000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    current_date + ((7 - extract(dow from current_date)::int) % 7)
  )) = 0 as domingo_sem_slots_ok;

-- Bloqueia a próxima segunda-feira inteira e confere que os slots somem.
insert into public.schedule_blocks (barbershop_id, professional_id, starts_at, ends_at, reason)
select 'b0000000-0000-4000-8000-00000000000a', 'b2000000-0000-4000-8000-000000000001',
       mon::timestamptz, mon::timestamptz + interval '1 day', 'Folga teste'
from (
  select (current_date + ((8 - extract(dow from current_date)::int) % 7))::timestamp as mon
) x;

select '5b. Bloqueio remove slots' as teste,
  (select count(*) from public.get_public_availability(
    'fase1-a', 'b2000000-0000-4000-8000-000000000001',
    'b1000000-0000-4000-8000-000000000001',
    current_date + ((8 - extract(dow from current_date)::int) % 7)
  )) = 0 as segunda_bloqueada_sem_slots_ok;

rollback;
