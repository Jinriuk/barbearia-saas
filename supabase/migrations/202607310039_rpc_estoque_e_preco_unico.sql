-- Correções pós-Fase 5: a RPC de estoque que nunca existiu e o preço em dois
-- lugares.
--
-- 1) get_product_stock — `/vendas` e o Início chamam esta função desde a Fase 2
--    e ela NUNCA foi criada. O cliente do Supabase devolve erro, o código faz
--    `data ?? []`, o mapa de saldos nasce vazio e todo produto aparece com
--    estoque zero. Consequência prática: a venda de balcão de uma conta nova
--    não sai, e o alerta de estoque baixo do Início conta sempre zero. É a
--    view product_stock_balances (Fase 0) exposta com o nome e o formato que
--    as duas telas já esperam.
--
-- 2) create_barbershop gravava `case when plus then 9990 else 4990 end` — os
--    preços da versão 1 do catálogo. Desde a Fase 5 o preço vigente é o da
--    versão 2 (5990/11990), então toda conta criada nascia com a assinatura
--    carimbada no preço velho, e era esse número que a primeira cobrança real
--    usaria. O preço passa a vir de plan_prices, que é a fonte de verdade —
--    a próxima mudança de preço não vai precisar de migração nenhuma.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Saldo de estoque por produto.
--
-- `security invoker` de propósito: a view já é security_invoker e a RLS de
-- products/inventory_movements faz o isolamento entre barbearias. Uma função
-- definer aqui teria que refazer essa checagem à mão, sem ganhar nada.
create or replace function public.get_product_stock(p_barbershop uuid)
returns table (
  product_id uuid,
  balance numeric,
  on_hand numeric,
  reserved numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    b.product_id,
    -- `balance` é o disponível (físico menos o que já está reservado para
    -- agendamento pendente): é o que dá para vender no balcão agora. Vender
    -- sobre o físico deixaria o cliente que reservou sem produto.
    b.available as balance,
    b.on_hand,
    b.reserved
  from public.product_stock_balances b
  where b.barbershop_id = p_barbershop;
$$;

revoke all on function public.get_product_stock(uuid) from public;
grant execute on function public.get_product_stock(uuid) to authenticated;

comment on function public.get_product_stock(uuid) is
  'Saldo por produto da barbearia. balance = disponível (físico − reservado).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Preço da assinatura nova sai do catálogo, não de constante.
create or replace function public.create_barbershop(
  p_name text,
  p_slug text,
  p_plan text,
  p_vertical text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  profile_id uuid;
  new_barbershop_id uuid;
  clean_name text := trim(p_name);
  clean_slug text := lower(trim(p_slug));
  clean_plan text := coalesce(nullif(trim(p_plan), ''), 'starter');
  clean_vertical text := coalesce(nullif(trim(p_vertical), ''), 'barber');
  v_price_cents integer;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  if char_length(clean_name) not between 2 and 100 then
    raise exception 'INVALID_NAME' using errcode = 'P0001';
  end if;
  if clean_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(clean_slug) not between 3 and 63 then
    raise exception 'INVALID_SLUG' using errcode = 'P0001';
  end if;
  if clean_plan not in ('starter', 'plus') then
    raise exception 'INVALID_PLAN' using errcode = 'P0001';
  end if;
  if clean_vertical not in ('barber', 'salon') then
    raise exception 'INVALID_VERTICAL' using errcode = 'P0001';
  end if;

  select p.id into profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid();
  if profile_id is null then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.barbershops (name, slug, plan, vertical)
  values (clean_name, clean_slug, clean_plan, clean_vertical)
  returning id into new_barbershop_id;

  insert into public.memberships (profile_id, barbershop_id, role, status)
  values (profile_id, new_barbershop_id, 'owner', 'active');

  -- Ponto de partida do tema conforme a vertical; o dono personaliza depois.
  if clean_vertical = 'salon' then
    insert into public.tenant_settings
      (barbershop_id, primary_color, secondary_color, background_color)
    values (new_barbershop_id, '#c2497c', '#33202b', '#fdf8f5');
  else
    insert into public.tenant_settings (barbershop_id)
    values (new_barbershop_id);
  end if;

  -- Preço vigente do catálogo (mesma regra do get_plan_catalog: maior versão
  -- ativa já em vigor). O fallback são os preços da versão 2, para o caso de
  -- alguém apagar a linha do catálogo — nunca a constante antiga.
  select pp.price_cents into v_price_cents
  from public.plan_prices pp
  where pp.plan = clean_plan
    and pp.period = 'monthly'
    and pp.active
    and pp.valid_from <= now()
  order by pp.version desc
  limit 1;

  insert into public.subscriptions
    (barbershop_id, plan, status, price_cents, billing_period, trial_ends_at)
  values
    (new_barbershop_id, clean_plan, 'trialing',
     coalesce(v_price_cents, case when clean_plan = 'plus' then 11990 else 5990 end),
     'monthly',
     now() + interval '7 days');

  insert into public.audit_logs (barbershop_id, actor_profile_id, action, entity_type, entity_id)
  values (new_barbershop_id, profile_id, 'barbershop.created', 'barbershop', new_barbershop_id);

  return new_barbershop_id;
exception
  when unique_violation then
    raise exception 'SLUG_UNAVAILABLE' using errcode = 'P0001';
end;
$function$;

commit;
