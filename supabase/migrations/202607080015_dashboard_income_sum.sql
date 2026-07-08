-- Soma de receitas pagas por período, calculada no banco (dashboard, etapa 4).
-- Somar no cliente esbarra no teto de linhas do PostgREST (~1000) em meses de
-- alto volume, subcontando os cards "recebido no dia/semana/mês". Aqui o SUM
-- roda no Postgres. security invoker → a RLS de financial_transactions se
-- aplica ao chamador, então cada barbearia só soma o próprio caixa.
create or replace function public.sum_paid_income(
  p_barbershop uuid,
  p_from timestamptz,
  p_to timestamptz
) returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(amount), 0)::numeric
  from public.financial_transactions
  where barbershop_id = p_barbershop
    and type = 'income'
    and status = 'paid'
    and paid_at >= p_from
    and paid_at < p_to;
$$;
revoke all on function public.sum_paid_income(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.sum_paid_income(uuid, timestamptz, timestamptz)
  to authenticated;
