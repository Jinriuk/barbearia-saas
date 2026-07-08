-- Reservas e vendas de produto (etapas 7.2, 7.3, 9.2, 9.3).
-- Os produtos do agendamento viram "reservas" (pending). A venda só dá baixa
-- no estoque e vira receita quando confirmada — desacoplado da receita de serviço.

alter table public.appointment_products
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'canceled')),
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by uuid references public.profiles(id);

-- Registros históricos ficam confirmados (já estavam embutidos na receita antiga).
update public.appointment_products set status = 'confirmed'
where status = 'pending' and created_at < now() - interval '1 minute';

-- A conclusão do atendimento passa a lançar SOMENTE o serviço.
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
begin
  if new.status = 'completed' and (old.status is distinct from new.status) then
    if exists (
      select 1 from public.financial_transactions
      where appointment_id = new.id and type = 'income' and category = 'service'
    ) then
      return new;
    end if;
    select s.price, s.name into v_service_price, v_service_name
    from public.services s where s.id = new.service_id;
    select c.name into v_client_name
    from public.clients c where c.id = new.client_id;
    if coalesce(v_service_price, 0) <= 0 then
      return new;
    end if;
    insert into public.financial_transactions
      (barbershop_id, type, status, category, description, amount, paid_at,
       appointment_id, created_by)
    values
      (new.barbershop_id, 'income', 'paid', 'service',
       coalesce(v_service_name, 'Atendimento') || ' — ' ||
         coalesce(v_client_name, 'Cliente'),
       v_service_price, now(), new.id, new.created_by);
  end if;
  return new;
end;
$$;
revoke all on function public.sync_completed_appointment_income()
  from public, anon, authenticated;

-- Confirmar venda: baixa no estoque + receita (categoria product) + confirma.
create or replace function public.confirm_product_sale(p_appointment_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select ap.id, ap.barbershop_id, ap.product_id, ap.quantity, ap.unit_price,
         ap.status, ap.appointment_id, a.professional_id, pd.name as product_name
  into r
  from public.appointment_products ap
  join public.appointments a on a.id = ap.appointment_id
  join public.products pd on pd.id = ap.product_id
  where ap.id = p_appointment_product_id;

  if not found then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not (
    public.has_barbershop_role(
      r.barbershop_id,
      array['owner', 'manager', 'receptionist']::public.membership_role[]
    )
    or public.is_own_professional(r.professional_id)
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if r.status = 'confirmed' then
    return;
  end if;
  if r.status = 'canceled' then
    raise exception 'RESERVATION_CANCELED' using errcode = 'P0001';
  end if;

  update public.appointment_products
  set status = 'confirmed', confirmed_at = now(),
      confirmed_by = public.current_profile_id()
  where id = p_appointment_product_id;

  insert into public.inventory_movements
    (barbershop_id, product_id, type, quantity, reason, created_by)
  values
    (r.barbershop_id, r.product_id, 'sale', r.quantity,
     'Venda confirmada', public.current_profile_id());

  insert into public.financial_transactions
    (barbershop_id, type, status, category, description, amount, paid_at,
     appointment_id, created_by)
  values
    (r.barbershop_id, 'income', 'paid', 'product',
     'Venda — ' || coalesce(r.product_name, 'Produto'),
     r.quantity * r.unit_price, now(), r.appointment_id,
     public.current_profile_id());
end;
$$;
revoke all on function public.confirm_product_sale(uuid) from public, anon;
grant execute on function public.confirm_product_sale(uuid) to authenticated;

-- Cancelar reserva pendente: sem baixa, sem receita.
create or replace function public.cancel_product_sale(p_appointment_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select ap.id, ap.barbershop_id, ap.status, a.professional_id
  into r
  from public.appointment_products ap
  join public.appointments a on a.id = ap.appointment_id
  where ap.id = p_appointment_product_id;

  if not found then
    raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not (
    public.has_barbershop_role(
      r.barbershop_id,
      array['owner', 'manager', 'receptionist']::public.membership_role[]
    )
    or public.is_own_professional(r.professional_id)
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if r.status <> 'pending' then
    raise exception 'RESERVATION_NOT_PENDING' using errcode = 'P0001';
  end if;

  update public.appointment_products
  set status = 'canceled', confirmed_at = now(),
      confirmed_by = public.current_profile_id()
  where id = p_appointment_product_id;
end;
$$;
revoke all on function public.cancel_product_sale(uuid) from public, anon;
grant execute on function public.cancel_product_sale(uuid) to authenticated;
