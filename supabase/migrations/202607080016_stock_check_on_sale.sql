-- Vistoria: confirmar venda de produto agora exige saldo em estoque.
-- Antes, confirm_product_sale registrava a baixa sem checar o saldo, o que
-- permitia estoque negativo (overselling). O produto é travado (for update)
-- para impedir duas confirmações simultâneas de furarem o saldo.

create or replace function public.confirm_product_sale(p_appointment_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_stock numeric;
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

  -- Serializa confirmações do mesmo produto e valida o saldo do ledger.
  perform 1 from public.products where id = r.product_id for update;
  select coalesce(sum(
    case when type in ('purchase', 'adjustment_in', 'return')
      then quantity else -quantity end
  ), 0)
  into v_stock
  from public.inventory_movements
  where product_id = r.product_id and barbershop_id = r.barbershop_id;

  if v_stock < r.quantity then
    raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
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
