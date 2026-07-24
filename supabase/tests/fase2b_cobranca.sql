-- Fase 2B — testes de cobrança do SaaS. Transação com ROLLBACK.
--
-- O que prova:
--  1) Catálogo de preços: versão vigente por plano/periodicidade; inserir
--     versão nova troca o preço sem editar o histórico.
--  2) billing_events: evento repetido (mesmo provider_event_id) é rejeitado
--     pelo unique — a idempotência do webhook tem lastro no banco.
--  3) RLS: anon lê o catálogo, mas não lê billing_events nem saas_leads;
--     membro lê a própria assinatura e não altera nem lê a de outro tenant.

begin;

-- ── 1) Catálogo versionado ──────────────────────────────────────────────────
select '1a. Catálogo vigente' as teste,
  (select count(*) from public.get_plan_catalog()) = 4 as quatro_precos_ok,
  (select price_cents from public.get_plan_catalog()
    where plan = 'starter' and period = 'monthly') = 4990 as starter_mensal_ok,
  (select price_cents from public.get_plan_catalog()
    where plan = 'plus' and period = 'yearly') = 99900 as plus_anual_ok;

insert into public.plan_prices (plan, period, price_cents, version)
values ('starter', 'monthly', 5990, 2);

select '1b. Nova versão vence' as teste,
  (select price_cents from public.get_plan_catalog()
    where plan = 'starter' and period = 'monthly') = 5990 as preco_novo_ok,
  (select count(*) from public.plan_prices
    where plan = 'starter' and period = 'monthly') = 2 as historico_preservado_ok;

-- ── 2) Idempotência dos eventos ─────────────────────────────────────────────
insert into public.billing_events (provider, provider_event_id, event_type)
values ('generic', 'evt_teste_1', 'payment.approved');

do $$
begin
  begin
    insert into public.billing_events (provider, provider_event_id, event_type)
    values ('generic', 'evt_teste_1', 'payment.approved');
    raise notice 'ALERTA: evento duplicado aceito';
  exception when unique_violation then
    raise notice '2. OK: evento duplicado rejeitado pelo unique';
  end;
end $$;

-- ── 3) RLS ──────────────────────────────────────────────────────────────────
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('f5000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','f2b-a@teste.dev','x', now(), '{"provider":"email"}','{"full_name":"Dono 2B-A"}', now(), now()),
  ('f5000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','f2b-b@teste.dev','x', now(), '{"provider":"email"}','{"full_name":"Dono 2B-B"}', now(), now());

insert into public.barbershops (id, name, slug) values
  ('90000000-0000-4000-8000-00000000000a', 'F2B A', 'f2b-a'),
  ('90000000-0000-4000-8000-00000000000b', 'F2B B', 'f2b-b');
insert into public.memberships (barbershop_id, profile_id, role)
select '90000000-0000-4000-8000-00000000000a'::uuid, p.id, 'owner'::public.membership_role
from public.profiles p where p.auth_user_id = 'f5000000-0000-4000-8000-000000000001'
union all
select '90000000-0000-4000-8000-00000000000b'::uuid, p.id, 'owner'::public.membership_role
from public.profiles p where p.auth_user_id = 'f5000000-0000-4000-8000-000000000002';

insert into public.subscriptions (barbershop_id, plan, status, price_cents, current_period_end)
values
  ('90000000-0000-4000-8000-00000000000a', 'starter', 'active', 4990, now() + interval '30 days'),
  ('90000000-0000-4000-8000-00000000000b', 'plus', 'active', 9990, now() + interval '30 days');

insert into public.saas_leads (name, contact, contact_normalized, channel, consent)
values ('Lead Teste', '11 98888-0000', '11988880000', 'whatsapp', true);

set local role anon;
select '3a. Anon' as teste,
  (select count(*) from public.get_plan_catalog()) = 4 as catalogo_publico_ok,
  (select count(*) from public.billing_events) = 0 as eventos_invisiveis_ok,
  (select count(*) from public.saas_leads) = 0 as leads_invisiveis_ok;
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"f5000000-0000-4000-8000-000000000001","role":"authenticated"}';
select '3b. Membro' as teste,
  (select count(*) from public.subscriptions
    where barbershop_id = '90000000-0000-4000-8000-00000000000a') = 1 as le_propria_ok,
  (select count(*) from public.subscriptions
    where barbershop_id = '90000000-0000-4000-8000-00000000000b') = 0 as nao_le_alheia_ok,
  (select count(*) from public.saas_leads) = 0 as leads_restritos_ok;

-- Membro não escreve na própria assinatura (sem policy de update).
update public.subscriptions set price_cents = 1
where barbershop_id = '90000000-0000-4000-8000-00000000000a';
reset role;

select '3c. Escrita bloqueada' as teste,
  (select price_cents from public.subscriptions
    where barbershop_id = '90000000-0000-4000-8000-00000000000a') = 4990 as update_bloqueado_ok;

rollback;
