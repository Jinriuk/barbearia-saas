-- Receita automática ao concluir atendimento (Financeiro integrado — etapa 10.1).
-- Quando um agendamento passa para 'completed', cria uma entrada de receita
-- (serviço + produtos do atendimento) se ainda não existir. Inclui backfill
-- dos atendimentos já concluídos.

create or replace function public.sync_completed_appointment_income()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_price numeric;
  v_service_name text;
  v_client_name text;
  v_products_total numeric;
  v_amount numeric;
begin
  if new.status = 'completed' and (old.status is distinct from new.status) then
    if exists (
      select 1 from public.financial_transactions
      where appointment_id = new.id and type = 'income'
    ) then
      return new;
    end if;

    select s.price, s.name into v_service_price, v_service_name
    from public.services s where s.id = new.service_id;

    select coalesce(sum(ap.quantity * ap.unit_price), 0) into v_products_total
    from public.appointment_products ap where ap.appointment_id = new.id;

    select c.name into v_client_name
    from public.clients c where c.id = new.client_id;

    v_amount := coalesce(v_service_price, 0) + coalesce(v_products_total, 0);
    if v_amount <= 0 then
      return new;
    end if;

    insert into public.financial_transactions
      (barbershop_id, type, status, category, description, amount, paid_at,
       appointment_id, created_by)
    values
      (new.barbershop_id, 'income', 'paid', 'service',
       coalesce(v_service_name, 'Atendimento') || ' — ' ||
         coalesce(v_client_name, 'Cliente'),
       v_amount, now(), new.id, new.created_by);
  end if;
  return new;
end;
$$;

-- Função de trigger não deve ser exposta como RPC ao público/usuários.
revoke all on function public.sync_completed_appointment_income()
  from public, anon, authenticated;

drop trigger if exists trg_sync_completed_appointment_income on public.appointments;
create trigger trg_sync_completed_appointment_income
after update of status on public.appointments
for each row
execute function public.sync_completed_appointment_income();

-- Backfill dos atendimentos já concluídos sem receita registrada.
insert into public.financial_transactions
  (barbershop_id, type, status, category, description, amount, paid_at,
   appointment_id, created_by)
select
  a.barbershop_id, 'income', 'paid', 'service',
  coalesce(s.name, 'Atendimento') || ' — ' || coalesce(c.name, 'Cliente'),
  coalesce(s.price, 0) + coalesce(p.products_total, 0),
  coalesce(a.updated_at, now()), a.id, a.created_by
from public.appointments a
left join public.services s on s.id = a.service_id
left join public.clients c on c.id = a.client_id
left join lateral (
  select sum(ap.quantity * ap.unit_price) as products_total
  from public.appointment_products ap where ap.appointment_id = a.id
) p on true
where a.status = 'completed'
  and coalesce(s.price, 0) + coalesce(p.products_total, 0) > 0
  and not exists (
    select 1 from public.financial_transactions ft
    where ft.appointment_id = a.id and ft.type = 'income'
  );
