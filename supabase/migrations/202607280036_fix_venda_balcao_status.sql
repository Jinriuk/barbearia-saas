-- Correção — venda de balcão não gravava (Fase 2.6).
--
-- Achado ao rodar `supabase/tests/fase2_operacao_diaria.sql` contra um banco
-- reconstruído do zero durante o merge da Fase 3. NÃO é regressão desta fase:
-- reproduz na 0034 sozinha.
--
-- O defeito: em `create_counter_sale`, a coluna `status` recebia
--
--     case when p_payment_method is null then 'pending' else 'paid' end
--
-- Um CASE cujos dois braços são literais sem tipo resolve para TEXT
-- (`pg_typeof(...)` = text), e Postgres não converte text para enum
-- implicitamente. O INSERT falhava com
--
--     column "status" is of type financial_status but expression is of type text
--
-- e a exceção derrubava a transação inteira: NENHUMA venda de balcão era
-- gravada — nem o estoque baixava, nem a receita entrava. A tela "Nova venda"
-- do §7.6 (pilar G5) estava inteiramente inoperante.
--
-- A correção é o cast explícito. O corpo da função é o mesmo da 0034 em todo
-- o resto — recriado aqui porque a 0034 já foi aplicada e migração aplicada
-- não se edita.

begin;

create or replace function public.create_counter_sale(
  p_barbershop uuid,
  p_items jsonb,
  p_client_id uuid default null,
  p_professional_id uuid default null,
  p_discount numeric default 0,
  p_payment_method public.payment_method default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_price numeric(12,2);
  v_name text;
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2);
  v_total numeric(12,2);
  v_sale_id uuid;
  v_transaction_id uuid;
  v_lines integer := 0;
  v_units integer := 0;
  v_client_name text;
begin
  if not public.has_barbershop_role(
    p_barbershop,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'CART_TOO_LARGE' using errcode = 'P0001';
  end if;
  if p_client_id is not null and not exists (
    select 1 from public.clients c
    where c.id = p_client_id and c.barbershop_id = p_barbershop
  ) then
    raise exception 'CLIENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_professional_id is not null and not exists (
    select 1 from public.professionals pr
    where pr.id = p_professional_id and pr.barbershop_id = p_barbershop
  ) then
    raise exception 'PROFESSIONAL_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.counter_sales
    (barbershop_id, client_id, professional_id, subtotal, discount, total,
     payment_method, notes, created_by)
  values
    (p_barbershop, p_client_id, p_professional_id, 0, 0, 0,
     p_payment_method, nullif(trim(p_notes), ''), public.current_profile_id())
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    begin
      v_product_id := (v_item ->> 'productId')::uuid;
    exception when others then
      raise exception 'INVALID_PRODUCT' using errcode = 'P0001';
    end;
    v_quantity := coalesce((v_item ->> 'quantity')::integer, 0);
    if v_quantity < 1 or v_quantity > 999 then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
    end if;

    select pd.sale_price, pd.name into v_price, v_name
    from public.products pd
    where pd.id = v_product_id and pd.barbershop_id = p_barbershop and pd.active;
    if v_price is null then
      raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0001';
    end if;

    insert into public.counter_sale_items
      (barbershop_id, sale_id, product_id, quantity, unit_price)
    values
      (p_barbershop, v_sale_id, v_product_id, v_quantity, v_price);

    -- A trava de estoque negativo é o trigger da Fase 0.8
    -- (trg_enforce_inventory_balance): se faltar saldo, INSUFFICIENT_STOCK
    -- derruba a venda inteira, itens e receita junto.
    insert into public.inventory_movements
      (barbershop_id, product_id, type, quantity, reason, created_by)
    values
      (p_barbershop, v_product_id, 'sale', v_quantity,
       'Venda de balcão', public.current_profile_id());

    v_subtotal := v_subtotal + (v_price * v_quantity);
    v_lines := v_lines + 1;
    v_units := v_units + v_quantity;
  end loop;

  v_discount := round(greatest(coalesce(p_discount, 0), 0), 2);
  if v_discount > v_subtotal then
    raise exception 'DISCOUNT_TOO_LARGE' using errcode = 'P0001';
  end if;
  v_total := v_subtotal - v_discount;
  if v_total <= 0 then
    raise exception 'ZERO_TOTAL' using errcode = 'P0001';
  end if;

  if p_client_id is not null then
    select c.name into v_client_name
    from public.clients c where c.id = p_client_id;
  end if;

  insert into public.financial_transactions
    (barbershop_id, type, status, category, description, amount,
     payment_method, paid_at, created_by)
  values
    (p_barbershop, 'income',
     (case when p_payment_method is null then 'pending' else 'paid' end)::public.financial_status,
     'product',
     'Venda de balcão — ' || v_units || ' item' ||
       case when v_units = 1 then '' else 'ns' end ||
       coalesce(' — ' || v_client_name, ''),
     v_total,
     p_payment_method,
     case when p_payment_method is null then null else now() end,
     public.current_profile_id())
  returning id into v_transaction_id;

  update public.counter_sales
  set subtotal = v_subtotal,
      discount = v_discount,
      total = v_total,
      transaction_id = v_transaction_id
  where id = v_sale_id;

  insert into public.audit_logs
    (barbershop_id, actor_profile_id, action, entity_type, entity_id, metadata)
  values
    (p_barbershop, public.current_profile_id(), 'counter_sale.created',
     'counter_sale', v_sale_id,
     jsonb_build_object('lines', v_lines, 'units', v_units, 'total', v_total,
                        'paid', p_payment_method is not null));

  return jsonb_build_object(
    'saleId', v_sale_id,
    'total', v_total,
    'paid', p_payment_method is not null
  );
end;
$$;
revoke all on function public.create_counter_sale(
  uuid, jsonb, uuid, uuid, numeric, public.payment_method, text
) from public, anon;
grant execute on function public.create_counter_sale(
  uuid, jsonb, uuid, uuid, numeric, public.payment_method, text
) to authenticated;

-- Atalhos dos mais vendidos: as duas fontes de venda, últimos 90 dias.

commit;
