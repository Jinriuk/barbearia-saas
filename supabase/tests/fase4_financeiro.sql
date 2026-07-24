-- Fase 4 — teste do resumo financeiro (despesas + lucro em caixa).
begin;

insert into public.barbershops (id, name, slug) values
  ('70000000-0000-4000-8000-00000000000a', 'F4 A', 'f4-a');

insert into public.financial_transactions
  (barbershop_id, type, status, category, description, amount, paid_at, payment_method)
values
  ('70000000-0000-4000-8000-00000000000a', 'income', 'paid', 'service', 'r1', 100, now(), 'pix'),
  ('70000000-0000-4000-8000-00000000000a', 'expense', 'paid', 'salary', 'd1', 40, now(), null);
insert into public.financial_transactions
  (barbershop_id, type, status, category, description, amount)
values
  ('70000000-0000-4000-8000-00000000000a', 'income', 'pending', 'service', 'r2', 60);

select 'Resumo com despesas e lucro' as teste,
  s.sold = 160 as vendido_ok,
  s.received = 100 as recebido_ok,
  s.receivable = 60 as a_receber_ok,
  s.expenses_paid = 40 as despesas_ok,
  s.profit = 60 as lucro_caixa_ok
from public.income_summary(
  '70000000-0000-4000-8000-00000000000a',
  now() - interval '1 day', now() + interval '1 day') s;

rollback;
