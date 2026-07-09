-- Verticais do SaaS: o mesmo motor atende barbearias (NexoBarber) e salões
-- de beleza (NexoBeleza). A vertical nasce na landing do anúncio, viaja pelo
-- cadastro e fica gravada aqui para adaptar a página do cliente final.

alter table public.barbershops
  add column if not exists vertical text not null default 'barber'
    check (vertical in ('barber', 'salon'));

create or replace function public.create_barbershop(
  p_name text,
  p_slug text,
  p_plan text,
  p_vertical text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_id uuid;
  new_barbershop_id uuid;
  clean_name text := trim(p_name);
  clean_slug text := lower(trim(p_slug));
  clean_plan text := coalesce(nullif(trim(p_plan), ''), 'starter');
  clean_vertical text := coalesce(nullif(trim(p_vertical), ''), 'barber');
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

  insert into public.tenant_settings (barbershop_id)
  values (new_barbershop_id);

  insert into public.subscriptions
    (barbershop_id, plan, status, price_cents, trial_ends_at)
  values
    (new_barbershop_id, clean_plan, 'trialing',
     case when clean_plan = 'plus' then 9990 else 4990 end,
     now() + interval '7 days');

  insert into public.audit_logs (barbershop_id, actor_profile_id, action, entity_type, entity_id)
  values (new_barbershop_id, profile_id, 'barbershop.created', 'barbershop', new_barbershop_id);

  return new_barbershop_id;
exception
  when unique_violation then
    raise exception 'SLUG_UNAVAILABLE' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_barbershop(text, text, text, text) from public, anon;
grant execute on function public.create_barbershop(text, text, text, text) to authenticated;

-- Overload de 3 argumentos delega para o novo (compatibilidade de deploy).
create or replace function public.create_barbershop(p_name text, p_slug text, p_plan text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.create_barbershop(p_name, p_slug, p_plan, 'barber');
$$;
revoke all on function public.create_barbershop(text, text, text) from public, anon;
grant execute on function public.create_barbershop(text, text, text) to authenticated;
