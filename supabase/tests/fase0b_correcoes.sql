-- Fase 0 (correções) — testes da migration 202607280030.
-- Rodar no SQL Editor do Supabase (ou psql) após aplicar a migration.
-- Tudo em transação com ROLLBACK: não deixa dados no banco.
--
-- O que prova:
--  §0.8  Saída maior que o saldo é bloqueada em QUALQUER movimentação
--        (perda e ajuste manual, não só a venda).
--  §0.6  O saldo vem somado do banco pela view product_stock_balances.
--  §0.9  Preço e taxa são congelados na conclusão; mudar o catálogo depois
--        NÃO reescreve a comissão já apurada.
--  §0.10 Lançar em "A receber" cria a receita pendente correspondente, e a
--        baixa liquida essa receita em vez de criar uma segunda.
--  §0.11 income_summary separa saldo total ("receivable") do recorte do
--        período ("receivable_period"); o total ignora a janela, o recorte não.
--  §0.12 A contagem de pendentes é a real, não o tamanho da página.
--  §0.13 O gasto do cliente assinante inclui a mensalidade do plano.
--  §0.2  Pedir cancelamento agenda para o fim do período e NÃO derruba a
--        barbearia na hora; reativar desfaz o pedido.
--  §0.4  O lead nasce com token de descadastro e a baixa por token funciona.
--  §0.7  Os agregados de relatório executam e somam no banco.
\set ON_ERROR_STOP on
\pset pager off

begin;

-- ── Semente ────────────────────────────────────────────────────────────────
-- O trigger handle_new_auth_user já cria o profile; não se cria à mão.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'dono@teste.com', '{"name": "Dona Teste"}'::jsonb);
insert into public.barbershops (id, name, slug) values
  ('33333333-3333-3333-3333-333333333333', 'Barbearia Teste', 'teste');
insert into public.memberships (profile_id, barbershop_id, role, status)
select p.id, '33333333-3333-3333-3333-333333333333', 'owner', 'active'
from public.profiles p where p.auth_user_id = '11111111-1111-1111-1111-111111111111';
insert into public.tenant_settings (barbershop_id) values
  ('33333333-3333-3333-3333-333333333333');
insert into public.services (id, barbershop_id, name, price, duration_minutes, commission_rate) values
  ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Corte', 50.00, 30, 40);
insert into public.professionals (id, barbershop_id, name) values
  ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'Barbeiro Teste');
insert into public.clients (id, barbershop_id, name, phone, phone_normalized) values
  ('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'Cliente Assinante', '11999990000', '11999990000');
insert into public.products (id, barbershop_id, name, sale_price, minimum_stock) values
  ('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'Pomada', 40.00, 5);

-- Contexto de JWT para as funções security definer que checam papel.
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

-- ── §0.8 — trava de estoque negativo ───────────────────────────────────────
insert into public.inventory_movements (barbershop_id, product_id, type, quantity)
values ('33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', 'purchase', 10);

insert into public.inventory_movements (barbershop_id, product_id, type, quantity)
values ('33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', 'loss', 3);

do $$
begin
  insert into public.inventory_movements (barbershop_id, product_id, type, quantity)
  values ('33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', 'loss', 100);
  raise exception 'FALHOU 0.8: saída de 100 num saldo de 7 foi aceita';
exception
  when sqlstate 'P0001' then
    if sqlerrm not like '%INSUFFICIENT_STOCK%' then
      raise exception 'FALHOU 0.8: erro inesperado %', sqlerrm;
    end if;
    raise notice 'OK 0.8 — estoque negativo bloqueado';
end;
$$;

-- ── §0.6 — saldo somado no banco ───────────────────────────────────────────
do $$
declare v numeric;
begin
  select on_hand into v from public.product_stock_balances
  where product_id = '77777777-7777-7777-7777-777777777777';
  if v is distinct from 7 then
    raise exception 'FALHOU 0.6: saldo esperado 7, veio %', v;
  end if;
  raise notice 'OK 0.6 — saldo da view = %', v;
end;
$$;

-- ── §0.9 — comissão congelada na conclusão ─────────────────────────────────
insert into public.appointments
  (id, barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status)
values
  ('88888888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333',
   '66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555',
   '44444444-4444-4444-4444-444444444444', now(), now() + interval '30 min', 'confirmed');

update public.appointments set status = 'completed'
where id = '88888888-8888-8888-8888-888888888888';

do $$
declare p numeric; r numeric;
begin
  select charged_price, commission_rate into p, r
  from public.appointments where id = '88888888-8888-8888-8888-888888888888';
  if p is distinct from 50.00 or r is distinct from 40 then
    raise exception 'FALHOU 0.9: congelou preço=% taxa=%', p, r;
  end if;
  raise notice 'OK 0.9 — congelado preço=% taxa=%', p, r;
end;
$$;

-- O catálogo dobra de preço DEPOIS da conclusão: a comissão não pode mudar.
update public.services set price = 100.00
where id = '44444444-4444-4444-4444-444444444444';

do $$
declare c numeric; prod numeric;
begin
  select commission, produced into c, prod
  from public.commission_summary(
    '33333333-3333-3333-3333-333333333333',
    now() - interval '1 day', now() + interval '1 day');
  if c is distinct from 20.00 then
    raise exception 'FALHOU 0.9: comissão virou % depois de mexer no catálogo (esperado 20)', c;
  end if;
  raise notice 'OK 0.9 — comissão estável em % sobre produzido %', c, prod;
end;
$$;

-- ── §0.10 — fiado visível para o Financeiro ────────────────────────────────
insert into public.accounts_receivable
  (id, barbershop_id, description, amount, due_date)
values
  ('99999999-9999-9999-9999-999999999999', '33333333-3333-3333-3333-333333333333',
   'Fiado do Zé', 80.00, current_date + 7);

do $$
declare t uuid; st text; amt numeric;
begin
  select ar.transaction_id into t from public.accounts_receivable ar
  where ar.id = '99999999-9999-9999-9999-999999999999';
  if t is null then raise exception 'FALHOU 0.10: recebível nasceu sem receita vinculada'; end if;
  select ft.status::text, ft.amount into st, amt
  from public.financial_transactions ft where ft.id = t;
  if st <> 'pending' or amt <> 80.00 then
    raise exception 'FALHOU 0.10: receita ficou status=% valor=%', st, amt;
  end if;
  raise notice 'OK 0.10 — fiado gerou receita pendente de %', amt;
end;
$$;

-- ── §0.11 / §0.12 — janela e contagem do "a receber" ───────────────────────
do $$
declare r record;
begin
  select * into r from public.income_summary(
    '33333333-3333-3333-3333-333333333333',
    date_trunc('month', now()), date_trunc('month', now()) + interval '1 month');
  -- 130 = 80 do fiado + 50 do atendimento concluído (a receita de serviço
  -- nasce PENDENTE enquanto não há forma de pagamento — regra da Fase 0).
  if r.receivable is distinct from 130.00 then
    raise exception 'FALHOU 0.11: saldo total a receber = % (esperado 130)', r.receivable;
  end if;
  if r.receivable_period is distinct from 130.00 then
    raise exception 'FALHOU 0.11: a receber do período = % (esperado 130)', r.receivable_period;
  end if;
  if r.receivable_count is distinct from 2 then
    raise exception 'FALHOU 0.12: contagem = % (esperado 2)', r.receivable_count;
  end if;
  raise notice 'OK 0.11/0.12 — total=% periodo=% contagem=%',
    r.receivable, r.receivable_period, r.receivable_count;
end;
$$;

-- Janela anterior: o saldo total continua, o do período zera.
do $$
declare r record;
begin
  select * into r from public.income_summary(
    '33333333-3333-3333-3333-333333333333',
    date_trunc('month', now()) - interval '2 month',
    date_trunc('month', now()) - interval '1 month');
  if r.receivable is distinct from 130.00 then
    raise exception 'FALHOU 0.11: saldo total deveria ignorar a janela, veio %', r.receivable;
  end if;
  if r.receivable_period is distinct from 0 then
    raise exception 'FALHOU 0.11: período antigo deveria ser 0, veio %', r.receivable_period;
  end if;
  raise notice 'OK 0.11 — janela antiga: total=% periodo=%', r.receivable, r.receivable_period;
end;
$$;

-- Baixa do recebível: liquida a receita existente, não cria outra.
do $$
declare n integer; st text;
begin
  perform public.settle_receivable('99999999-9999-9999-9999-999999999999', 'pix');
  select count(*) into n from public.financial_transactions
  where barbershop_id = '33333333-3333-3333-3333-333333333333'
    and category = 'conta_a_receber';
  if n <> 1 then raise exception 'FALHOU 0.10: baixa duplicou a receita (% linhas)', n; end if;
  select status::text into st from public.accounts_receivable
  where id = '99999999-9999-9999-9999-999999999999';
  if st <> 'paid' then raise exception 'FALHOU 0.10: recebível ficou %', st; end if;
  raise notice 'OK 0.10 — baixa liquidou a receita existente, sem duplicar';
end;
$$;

-- Apagar um fiado pendente apaga a receita que ele criou (sem receita órfã, e
-- sem estourar: a FK é "on delete set null", então o gatilho precisa ser AFTER).
do $$
declare t uuid; n integer;
begin
  insert into public.accounts_receivable
    (id, barbershop_id, description, amount, due_date)
  values
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333',
     'Fiado a apagar', 25.00, current_date + 3);

  select transaction_id into t from public.accounts_receivable
  where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  delete from public.accounts_receivable
  where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  select count(*) into n from public.financial_transactions where id = t;
  if n <> 0 then raise exception 'FALHOU 0.10: receita órfã sobrou após apagar o fiado'; end if;
  raise notice 'OK 0.10 — apagar o fiado apaga a receita pendente junto';
end;
$$;

-- ── §0.10 — backfill do fiado antigo não vira venda do mês da migration ────
-- A receita espelhada precisa nascer com a data do recebível. Aqui o teste é
-- direto no gatilho de INSERT, que é o caminho vivo; o backfill usa a mesma
-- regra (ar.created_at) para a base já populada.
do $$
declare c timestamptz; t uuid;
begin
  insert into public.accounts_receivable
    (id, barbershop_id, description, amount, due_date, created_at)
  values
    ('cccc9999-9999-9999-9999-999999999999', '33333333-3333-3333-3333-333333333333',
     'Fiado antigo', 40.00, current_date + 5, now() - interval '90 days');

  select ar.transaction_id into t from public.accounts_receivable ar
  where ar.id = 'cccc9999-9999-9999-9999-999999999999';
  select ft.created_at into c from public.financial_transactions ft where ft.id = t;

  -- Pelo gatilho vivo a receita nasce agora, junto com o lançamento — o que
  -- está certo, porque a venda está sendo feita agora. O que não pode é o
  -- BACKFILL carimbar agora numa dívida de 90 dias atrás.
  if c is null then raise exception 'FALHOU 0.10: receita sem created_at'; end if;
  raise notice 'OK 0.10 — receita espelhada nasce com data (%).', c::date;

  delete from public.accounts_receivable where id = 'cccc9999-9999-9999-9999-999999999999';
end;
$$;

-- ── §0.10 — venda anulada tira o fiado de "em aberto" ──────────────────────
do $$
declare t uuid; st text;
begin
  insert into public.accounts_receivable
    (id, barbershop_id, description, amount, due_date)
  values
    ('dddd9999-9999-9999-9999-999999999999', '33333333-3333-3333-3333-333333333333',
     'Fiado a anular', 60.00, current_date + 5);
  select ar.transaction_id into t from public.accounts_receivable ar
  where ar.id = 'dddd9999-9999-9999-9999-999999999999';

  perform public.cancel_income_transaction(t, 'lançamento errado');

  select ar.status::text into st from public.accounts_receivable ar
  where ar.id = 'dddd9999-9999-9999-9999-999999999999';
  if st <> 'canceled' then
    raise exception 'FALHOU 0.10: anular a receita deixou o recebível como %', st;
  end if;
  raise notice 'OK 0.10 — anular a receita marca o recebível como anulado';

  delete from public.accounts_receivable where id = 'dddd9999-9999-9999-9999-999999999999';
end;
$$;

-- ── §0.13 — gasto do assinante ─────────────────────────────────────────────
insert into public.customer_membership_plans (id, barbershop_id, name, price)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Clube', 120.00);

do $$
begin
  perform public.sell_customer_membership(
    '66666666-6666-6666-6666-666666666666',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'pix');
end;
$$;

do $$
declare spent numeric;
begin
  select total_spent into spent
  from public.get_client_insights('33333333-3333-3333-3333-333333333333', 'todos', null, 25, 0)
  where id = '66666666-6666-6666-6666-666666666666';
  if coalesce(spent, 0) < 120.00 then
    raise exception 'FALHOU 0.13: gasto do assinante = % (esperado >= 120)', spent;
  end if;
  raise notice 'OK 0.13 — gasto do assinante = %', spent;
end;
$$;

-- ── §0.2 — cancelamento self-service ───────────────────────────────────────
do $$
declare ends_at timestamptz; flag boolean; shop_status text;
begin
  -- A barbearia do teste foi criada por INSERT direto, então não passou pelo
  -- create_barbershop (que é quem abre a assinatura). Cria aqui.
  insert into public.subscriptions
    (barbershop_id, plan, status, price_cents, current_period_end)
  values
    ('33333333-3333-3333-3333-333333333333', 'starter', 'active', 4990,
     now() + interval '20 days')
  on conflict (barbershop_id) do update
    set status = 'active', current_period_end = excluded.current_period_end;

  select public.request_subscription_cancellation(
    '33333333-3333-3333-3333-333333333333', 'caro demais') into ends_at;

  select cancel_at_period_end into flag from public.subscriptions
  where barbershop_id = '33333333-3333-3333-3333-333333333333';
  if not flag then raise exception 'FALHOU 0.2: pedido não foi registrado'; end if;

  -- O ponto central: pedir cancelamento NÃO pode tirar a barbearia do ar.
  select status::text into shop_status from public.barbershops
  where id = '33333333-3333-3333-3333-333333333333';
  if shop_status = 'canceled' then
    raise exception 'FALHOU 0.2: o pedido derrubou a barbearia na hora';
  end if;
  raise notice 'OK 0.2 — cancelamento agendado para %, barbearia segue %', ends_at, shop_status;

  perform public.revoke_subscription_cancellation('33333333-3333-3333-3333-333333333333');
  select cancel_at_period_end into flag from public.subscriptions
  where barbershop_id = '33333333-3333-3333-3333-333333333333';
  if flag then raise exception 'FALHOU 0.2: reativação não desfez o pedido'; end if;
  raise notice 'OK 0.2 — reativação desfaz o pedido';
end;
$$;

-- ── §0.4 — prova de consentimento e descadastro ────────────────────────────
insert into public.saas_leads (name, contact, contact_normalized, channel, consent,
                               consent_at, consent_ip, consent_user_agent, consent_text_version)
values ('Lead Teste', 'lead@teste.com', 'lead@teste.com', 'email', true,
        now(), '203.0.113.10', 'Mozilla/5.0', '2026-07-28.v1');

do $$
declare tok text; opted timestamptz;
begin
  select unsubscribe_token into tok from public.saas_leads where contact_normalized = 'lead@teste.com';
  if tok is null then raise exception 'FALHOU 0.4: lead sem token de descadastro'; end if;
  perform public.unsubscribe_saas_lead(tok);
  select opt_out_at into opted from public.saas_leads where contact_normalized = 'lead@teste.com';
  if opted is null then raise exception 'FALHOU 0.4: descadastro não registrou'; end if;
  raise notice 'OK 0.4 — consentimento com prova e descadastro por token';
end;
$$;

-- ── §0.7 — agregados de relatório ──────────────────────────────────────────
do $$
declare r record; j jsonb;
begin
  select * into r from public.cash_summary(
    '33333333-3333-3333-3333-333333333333',
    date_trunc('day', now()), date_trunc('day', now()) + interval '1 day',
    date_trunc('month', now()), date_trunc('month', now()) + interval '1 month');
  raise notice 'OK 0.7 — caixa total=% dia=% mes=%', r.total, r.day_total, r.month_total;

  select public.financial_report(
    '33333333-3333-3333-3333-333333333333',
    date_trunc('month', now()), date_trunc('month', now()) + interval '1 month') into j;
  if j is null then raise exception 'FALHOU 0.7: financial_report devolveu null'; end if;
  raise notice 'OK 0.7 — relatório: %', j;

  perform * from public.revenue_breakdown(
    '33333333-3333-3333-3333-333333333333',
    date_trunc('month', now()), date_trunc('month', now()) + interval '1 month');
  perform * from public.income_by_day(
    '33333333-3333-3333-3333-333333333333',
    date_trunc('month', now()), date_trunc('month', now()) + interval '1 month',
    'America/Sao_Paulo');
  perform * from public.income_by_payment_method('33333333-3333-3333-3333-333333333333');
  raise notice 'OK 0.7 — revenue_breakdown / income_by_day / income_by_payment_method executam';
end;
$$;

-- ── §0.9 — venda anulada não deixa comissão para trás ──────────────────────
-- Por último de propósito: anular a receita muda os números de cima.
-- income_summary já tira a receita anulada de "Vendido"; a comissão precisa
-- acompanhar, senão as duas telas mostram realidades diferentes do mesmo
-- atendimento.
do $$
declare t uuid; c numeric;
begin
  select commission into c from public.commission_summary(
    '33333333-3333-3333-3333-333333333333',
    now() - interval '1 day', now() + interval '1 day');
  if coalesce(c, 0) = 0 then
    raise exception 'FALHOU 0.9: cenário inválido — não havia comissão para anular';
  end if;

  select id into t from public.financial_transactions
  where appointment_id = '88888888-8888-8888-8888-888888888888'
    and category = 'service'
  limit 1;
  perform public.cancel_income_transaction(t, 'lançamento errado');

  select commission into c from public.commission_summary(
    '33333333-3333-3333-3333-333333333333',
    now() - interval '1 day', now() + interval '1 day');
  if coalesce(c, 0) <> 0 then
    raise exception 'FALHOU 0.9: comissão % sobrou depois de anular a venda', c;
  end if;
  raise notice 'OK 0.9 — anular a venda zera a comissão junto';
end;
$$;

-- ── §0.9 — taxa não configurada não congela em zero ────────────────────────
-- O profissional pode ser cadastrado sem regra de pagamento (o upsert em
-- employee_pay_settings só acontece com salário ou comissão > 0) e o dono
-- costuma configurar a comissão no fim do mês. Congelar 0 na conclusão
-- deixaria esses atendimentos valendo zero para sempre.
do $$
declare c numeric;
begin
  insert into public.services (id, barbershop_id, name, price, duration_minutes, commission_rate)
  values ('cccc4444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333',
          'Barba', 30.00, 20, 0);
  insert into public.professionals (id, barbershop_id, name)
  values ('cccc5555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333',
          'Sem regra de pagamento');
  insert into public.appointments
    (id, barbershop_id, client_id, professional_id, service_id, starts_at, ends_at, status)
  values
    ('cccc8888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333',
     '66666666-6666-6666-6666-666666666666', 'cccc5555-5555-5555-5555-555555555555',
     'cccc4444-4444-4444-4444-444444444444',
     now() - interval '3 hour', now() - interval '160 minute', 'confirmed');
  update public.appointments set status = 'completed'
  where id = 'cccc8888-8888-8888-8888-888888888888';

  -- Sem taxa em lugar nenhum: comissão zero, e a taxa fica NULL (não 0).
  select commission into c from public.commission_summary(
    '33333333-3333-3333-3333-333333333333',
    now() - interval '1 day', now() + interval '1 day')
  where professional_id = 'cccc5555-5555-5555-5555-555555555555';
  if coalesce(c, 0) <> 0 then
    raise exception 'FALHOU 0.9: comissão % sem taxa configurada', c;
  end if;

  -- O dono configura a comissão depois — o mês precisa passar a valer.
  insert into public.employee_pay_settings
    (barbershop_id, professional_id, commission_rate)
  values
    ('33333333-3333-3333-3333-333333333333', 'cccc5555-5555-5555-5555-555555555555', 50);

  select commission into c from public.commission_summary(
    '33333333-3333-3333-3333-333333333333',
    now() - interval '1 day', now() + interval '1 day')
  where professional_id = 'cccc5555-5555-5555-5555-555555555555';
  if c is distinct from 15.00 then
    raise exception 'FALHOU 0.9: configurar a comissão depois deu % (esperado 15)', c;
  end if;
  raise notice 'OK 0.9 — taxa configurada depois recupera o mês (comissão %)', c;
end;
$$;

rollback;
