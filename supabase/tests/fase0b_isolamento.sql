-- Fase 0 (correções) — isolamento entre tenants dos objetos novos.
-- Rodar após a migration 202607280030. Transação com ROLLBACK.
--
-- Prova que nenhuma das funções/views criadas na Fase 0 devolve dado de outra
-- barbearia quando chamada com o id dela:
--   product_stock_balances, cash_summary, income_summary,
--   income_by_payment_method, financial_report, revenue_breakdown,
--   income_by_day, commission_summary, request_subscription_cancellation,
--   get_client_insights.
--
-- O ponto: várias delas são `security invoker` (a RLS faz o trabalho) e outras
-- são `security definer` (precisam checar o papel por conta própria). Este
-- arquivo cobre os dois casos com o mesmo teste — o dono da barbearia A pedindo
-- os números da B.
\set ON_ERROR_STOP on
\pset pager off

begin;
-- Dois tenants, cada um com seu dono.
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaa1111-1111-1111-1111-111111111111','donoa@teste.com','{"name":"Dono A"}'::jsonb),
  ('bbbb2222-2222-2222-2222-222222222222','donob@teste.com','{"name":"Dono B"}'::jsonb);
insert into public.barbershops (id, name, slug) values
  ('aaaa3333-3333-3333-3333-333333333333','Barbearia A','barbearia-a'),
  ('bbbb3333-3333-3333-3333-333333333333','Barbearia B','barbearia-b');
insert into public.memberships (profile_id, barbershop_id, role, status)
select p.id,'aaaa3333-3333-3333-3333-333333333333','owner','active' from public.profiles p where p.auth_user_id='aaaa1111-1111-1111-1111-111111111111';
insert into public.memberships (profile_id, barbershop_id, role, status)
select p.id,'bbbb3333-3333-3333-3333-333333333333','owner','active' from public.profiles p where p.auth_user_id='bbbb2222-2222-2222-2222-222222222222';
insert into public.products (id, barbershop_id, name, sale_price) values
  ('aaaa4444-4444-4444-4444-444444444444','aaaa3333-3333-3333-3333-333333333333','Pomada A',10),
  ('bbbb4444-4444-4444-4444-444444444444','bbbb3333-3333-3333-3333-333333333333','Pomada B',20);
insert into public.inventory_movements (barbershop_id, product_id, type, quantity) values
  ('aaaa3333-3333-3333-3333-333333333333','aaaa4444-4444-4444-4444-444444444444','purchase',5),
  ('bbbb3333-3333-3333-3333-333333333333','bbbb4444-4444-4444-4444-444444444444','purchase',9);
insert into public.financial_transactions (barbershop_id, type, status, category, description, amount, paid_at, payment_method) values
  ('bbbb3333-3333-3333-3333-333333333333','income','paid','service','Segredo do B',777,now(),'pix');

-- Agora vira o dono A, com RLS ligada.
set local role authenticated;
set local request.jwt.claim.sub = 'aaaa1111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare n int; v numeric;
begin
  -- View de saldo: o A não pode ver produto do B.
  select count(*) into n from public.product_stock_balances
  where barbershop_id = 'bbbb3333-3333-3333-3333-333333333333';
  if n <> 0 then raise exception 'VAZAMENTO: view mostrou % produtos do outro tenant', n; end if;
  select count(*) into n from public.product_stock_balances
  where barbershop_id = 'aaaa3333-3333-3333-3333-333333333333';
  if n <> 1 then raise exception 'FALHOU: o A deveria ver o próprio produto, viu %', n; end if;
  raise notice 'OK — product_stock_balances respeita o tenant';

  -- Agregados financeiros com o id do OUTRO tenant devem vir zerados.
  select total into v from public.cash_summary('bbbb3333-3333-3333-3333-333333333333',
    now()-interval '1 day', now()+interval '1 day', now()-interval '1 day', now()+interval '1 day');
  if coalesce(v,0) <> 0 then raise exception 'VAZAMENTO: cash_summary do outro tenant devolveu %', v; end if;

  select received into v from public.income_summary('bbbb3333-3333-3333-3333-333333333333',
    now()-interval '1 day', now()+interval '1 day');
  if coalesce(v,0) <> 0 then raise exception 'VAZAMENTO: income_summary do outro tenant devolveu %', v; end if;

  select coalesce(sum(total),0) into v from public.income_by_payment_method('bbbb3333-3333-3333-3333-333333333333');
  if v <> 0 then raise exception 'VAZAMENTO: income_by_payment_method devolveu %', v; end if;

  select coalesce((public.financial_report('bbbb3333-3333-3333-3333-333333333333',
    now()-interval '1 day', now()+interval '1 day') ->> 'otherRevenue')::numeric, 0) into v;
  if v <> 0 then raise exception 'VAZAMENTO: financial_report devolveu %', v; end if;

  select coalesce(sum(total),0) into v from public.revenue_breakdown('bbbb3333-3333-3333-3333-333333333333',
    now()-interval '1 day', now()+interval '1 day');
  if v <> 0 then raise exception 'VAZAMENTO: revenue_breakdown devolveu %', v; end if;

  select coalesce(sum(total),0) into v from public.income_by_day('bbbb3333-3333-3333-3333-333333333333',
    now()-interval '1 day', now()+interval '1 day', 'UTC');
  if v <> 0 then raise exception 'VAZAMENTO: income_by_day devolveu %', v; end if;

  select coalesce(sum(commission),0) into v from public.commission_summary('bbbb3333-3333-3333-3333-333333333333',
    now()-interval '1 day', now()+interval '1 day');
  if v <> 0 then raise exception 'VAZAMENTO: commission_summary devolveu %', v; end if;
  raise notice 'OK — todos os agregados novos ficam mudos para o outro tenant';
end; $$;

-- Cancelar a assinatura do OUTRO tenant tem de ser negado.
do $$
begin
  perform public.request_subscription_cancellation('bbbb3333-3333-3333-3333-333333333333', 'ataque');
  raise exception 'VAZAMENTO: o dono A cancelou a assinatura do B';
exception
  when sqlstate 'P0001' then
    if sqlerrm not like '%NOT_AUTHORIZED%' then raise exception 'erro inesperado: %', sqlerrm; end if;
    raise notice 'OK — cancelar assinatura de outro tenant é negado';
end; $$;

-- Insights de cliente do outro tenant: negado.
do $$
begin
  perform * from public.get_client_insights('bbbb3333-3333-3333-3333-333333333333','todos',null,25,0);
  raise exception 'VAZAMENTO: get_client_insights respondeu para outro tenant';
exception
  when sqlstate 'P0001' then
    raise notice 'OK — get_client_insights nega outro tenant';
end; $$;
rollback;
