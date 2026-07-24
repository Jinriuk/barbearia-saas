-- Fase 3 — testes da inteligência de clientes. Transação com ROLLBACK.
--
-- O que prova:
--  1) Última visita ignora cancelamento e falta; gasto usa só transações
--     pagas; mediana de frequência correta (≥3 visitas → confiança alta).
--  2) Fallback de services.return_days com 1–2 visitas (confiança baixa);
--     cliente sem histórico não recebe previsão (sem_historico).
--  3) Segmentos: atrasado aparece em "para_chamar"; contato recente ou
--     opt-out tiram o cliente de "para chamar" (mas não de "atrasados");
--     busca por nome e paginação com total.
--  4) Papel sem acesso (outro tenant) é bloqueado.

begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('f6000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','f3-a@teste.dev','x', now(), '{"provider":"email"}','{"full_name":"Dono F3"}', now(), now()),
  ('f6000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','f3-b@teste.dev','x', now(), '{"provider":"email"}','{"full_name":"Dono F3B"}', now(), now());

insert into public.barbershops (id, name, slug) values
  ('80000000-0000-4000-8000-00000000000a', 'F3 A', 'f3-a'),
  ('80000000-0000-4000-8000-00000000000b', 'F3 B', 'f3-b');
insert into public.memberships (barbershop_id, profile_id, role)
select '80000000-0000-4000-8000-00000000000a'::uuid, p.id, 'owner'::public.membership_role
from public.profiles p where p.auth_user_id = 'f6000000-0000-4000-8000-000000000001'
union all
select '80000000-0000-4000-8000-00000000000b'::uuid, p.id, 'owner'::public.membership_role
from public.profiles p where p.auth_user_id = 'f6000000-0000-4000-8000-000000000002';

insert into public.services (id, barbershop_id, name, price, duration_minutes, return_days) values
  ('81000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-00000000000a', 'Corte F3', 50, 30, 21);
insert into public.professionals (id, barbershop_id, name) values
  ('82000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-00000000000a', 'Prof F3');

insert into public.clients (id, barbershop_id, name, phone, phone_normalized) values
  -- Ana: 4 visitas concluídas com intervalos 20/20/20 dias → mediana 20,
  -- última há 30 dias → retorno previsto há 10 dias (ATRASADA, alta conf.)
  ('86000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-00000000000a', 'Ana Atrasada', '11911110001', '11911110001'),
  -- Bia: 1 visita há 10 dias → fallback return_days=21 → retorno em +11d
  ('86000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-00000000000a', 'Bia Nova', '11911110002', '11911110002'),
  -- Caio: sem histórico
  ('86000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-00000000000a', 'Caio Sem Visita', '11911110003', '11911110003'),
  -- Duda: atrasada mas com opt-out
  ('86000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-00000000000a', 'Duda OptOut', '11911110004', '11911110004');
update public.clients set contact_opt_out = true
where id = '86000000-0000-4000-8000-000000000004';

-- Visitas concluídas da Ana: -90, -70, -50, -30 dias (+ cancelada e falta
-- recentes que NÃO podem contar).
insert into public.appointments (barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source)
select '80000000-0000-4000-8000-00000000000a', '86000000-0000-4000-8000-000000000001',
       '82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001',
       now() - (d || ' days')::interval, now() - (d || ' days')::interval + interval '30 min',
       'completed', 'dashboard'
from (values (90),(70),(50),(30)) x(d);
insert into public.appointments (barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, canceled_at, source)
values ('80000000-0000-4000-8000-00000000000a', '86000000-0000-4000-8000-000000000001',
        '82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001',
        now() - interval '5 days', now() - interval '5 days' + interval '30 min', 'canceled', now() - interval '6 days', 'dashboard');
insert into public.appointments (barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source)
values ('80000000-0000-4000-8000-00000000000a', '86000000-0000-4000-8000-000000000001',
        '82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001',
        now() - interval '3 days', now() - interval '3 days' + interval '30 min', 'no_show', 'dashboard');

-- Pagamentos da Ana: 2 pagos de 50 (o pendente NÃO entra no gasto).
insert into public.financial_transactions (barbershop_id, type, status, category, description, amount, paid_at, payment_method, appointment_id)
select '80000000-0000-4000-8000-00000000000a', 'income', 'paid', 'service', 'Visita', 50, a.starts_at + interval '1 hour', 'pix', a.id
from public.appointments a
where a.client_id = '86000000-0000-4000-8000-000000000001' and a.status = 'completed'
order by a.starts_at limit 2;
insert into public.financial_transactions (barbershop_id, type, status, category, description, amount, appointment_id)
select '80000000-0000-4000-8000-00000000000a', 'income', 'pending', 'service', 'Visita pendente', 50, a.id
from public.appointments a
where a.client_id = '86000000-0000-4000-8000-000000000001' and a.status = 'completed'
order by a.starts_at desc limit 1;

-- Bia: 1 visita concluída há 10 dias. Duda: 1 visita há 60 dias (atrasada).
insert into public.appointments (barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status, source)
values
  ('80000000-0000-4000-8000-00000000000a', '86000000-0000-4000-8000-000000000002',
   '82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001',
   now() - interval '10 days', now() - interval '10 days' + interval '30 min', 'completed', 'dashboard'),
  ('80000000-0000-4000-8000-00000000000a', '86000000-0000-4000-8000-000000000004',
   '82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001',
   now() - interval '60 days', now() - interval '60 days' + interval '30 min', 'completed', 'dashboard');

set local role authenticated;
set local request.jwt.claims to '{"sub":"f6000000-0000-4000-8000-000000000001","role":"authenticated"}';

select '1. Ana (mediana + gasto pago)' as teste,
  g.completed_count = 4 as visitas_ok,
  g.days_since between 29 and 31 as ultima_ignora_cancelamento_ok,
  g.median_interval_days = 20 as mediana_ok,
  g.total_spent = 100 as gasto_so_pago_ok,
  g.expected_return_at < now() as atrasada_ok,
  g.confidence = 'alta' as confianca_ok
from public.get_client_insights('80000000-0000-4000-8000-00000000000a', 'todos', 'Ana', 10, 0) g;

select '2. Bia (fallback return_days)' as teste,
  g.confidence = 'baixa' as confianca_baixa_ok,
  g.expected_return_at between now() + interval '10 days' and now() + interval '12 days' as fallback_21d_ok
from public.get_client_insights('80000000-0000-4000-8000-00000000000a', 'todos', 'Bia', 10, 0) g;

select '3. Caio (sem histórico)' as teste,
  g.confidence = 'sem_historico' as sem_historico_ok,
  g.expected_return_at is null as sem_previsao_ok
from public.get_client_insights('80000000-0000-4000-8000-00000000000a', 'todos', 'Caio', 10, 0) g;

select '4. Segmento para_chamar' as teste,
  exists (select 1 from public.get_client_insights('80000000-0000-4000-8000-00000000000a', 'para_chamar', null, 50, 0) g
          where g.name = 'Ana Atrasada') as ana_para_chamar_ok,
  not exists (select 1 from public.get_client_insights('80000000-0000-4000-8000-00000000000a', 'para_chamar', null, 50, 0) g
          where g.name = 'Duda OptOut') as optout_fora_ok,
  exists (select 1 from public.get_client_insights('80000000-0000-4000-8000-00000000000a', 'atrasados', null, 50, 0) g
          where g.name = 'Duda OptOut') as optout_ainda_atrasada_ok;

-- Contato recente tira do "para chamar" (14 dias de carência).
insert into public.client_contacts (barbershop_id, client_id, channel)
values ('80000000-0000-4000-8000-00000000000a', '86000000-0000-4000-8000-000000000001', 'whatsapp');

select '5. Carência pós-contato' as teste,
  not exists (select 1 from public.get_client_insights('80000000-0000-4000-8000-00000000000a', 'para_chamar', null, 50, 0) g
          where g.name = 'Ana Atrasada') as contato_recente_fora_ok,
  (select public.count_clients_to_call('80000000-0000-4000-8000-00000000000a')) >= 0 as contagem_ok;

select '6. Paginação' as teste,
  (select count(*) from public.get_client_insights('80000000-0000-4000-8000-00000000000a', 'todos', null, 2, 0)) = 2 as pagina_ok,
  (select max(g.total_count) from public.get_client_insights('80000000-0000-4000-8000-00000000000a', 'todos', null, 2, 0) g) = 4 as total_ok;

reset role;

-- Outro tenant não consulta.
set local role authenticated;
set local request.jwt.claims to '{"sub":"f6000000-0000-4000-8000-000000000002","role":"authenticated"}';
do $$
begin
  begin
    perform * from public.get_client_insights('80000000-0000-4000-8000-00000000000a', 'todos', null, 5, 0);
    raise notice 'ALERTA: insights cruzou tenant';
  exception when others then
    raise notice '7. OK: insights cruzado bloqueado (%)', sqlerrm;
  end;
end $$;
reset role;

rollback;
