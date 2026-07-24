-- Fase 4 — Financeiro gerencial: resumo com despesas e lucro (caixa) e
-- comparação de períodos na mesma fonte de verdade.
--
-- income_summary ganha despesas pagas e lucro (recebido − despesas pagas,
-- regime de caixa — docs/05). Mudar colunas de retorno exige drop + create.
--
-- Fonte única de comissão (decisão da Fase 4, docs/05): a taxa específica
-- do SERVIÇO (services.commission_rate > 0) tem precedência; senão vale a
-- taxa padrão do PROFISSIONAL (employee_pay_settings.commission_rate).
-- A comissão é DERIVADA dos atendimentos concluídos no período
-- (competência = vendido); estorno/desfazer conclusão recalcula sozinho.

begin;

drop function if exists public.income_summary(uuid, timestamptz, timestamptz);
create function public.income_summary(
  p_barbershop uuid,
  p_from timestamptz,
  p_to timestamptz
) returns table (
  sold numeric,
  received numeric,
  receivable numeric,
  expenses_paid numeric,
  profit numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with sums as (
    select
      coalesce((
        select sum(amount) from public.financial_transactions
        where barbershop_id = p_barbershop and type = 'income'
          and status <> 'canceled'
          and created_at >= p_from and created_at < p_to
      ), 0)::numeric as sold,
      coalesce((
        select sum(amount) from public.financial_transactions
        where barbershop_id = p_barbershop and type = 'income'
          and status = 'paid'
          and paid_at >= p_from and paid_at < p_to
      ), 0)::numeric as received,
      coalesce((
        select sum(amount) from public.financial_transactions
        where barbershop_id = p_barbershop and type = 'income'
          and status in ('pending', 'overdue')
      ), 0)::numeric as receivable,
      coalesce((
        select sum(amount) from public.financial_transactions
        where barbershop_id = p_barbershop and type = 'expense'
          and status = 'paid'
          and paid_at >= p_from and paid_at < p_to
      ), 0)::numeric as expenses_paid
  )
  select s.sold, s.received, s.receivable, s.expenses_paid,
         (s.received - s.expenses_paid) as profit
  from sums s;
$$;
revoke all on function public.income_summary(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.income_summary(uuid, timestamptz, timestamptz)
  to authenticated;

commit;
