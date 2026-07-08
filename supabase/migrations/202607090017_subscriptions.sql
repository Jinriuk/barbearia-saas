-- Assinaturas do SaaS: fonte da verdade de cobrança por barbearia.
--
-- Modelo de acesso (decidido com o dono):
--   • Trial de 7 dias ao criar a barbearia (acesso imediato, self-service).
--   • Venceu e não pagou: aviso no painel (past_due) → 5 dias depois o
--     painel bloqueia (suspended, página pública continua no ar) → 15 dias
--     depois cancela (canceled, página pública sai do ar). Tudo automático.
--   • barbershops.status é o espelho operacional sincronizado por trigger:
--     as RPCs públicas já filtram por ele, então a visibilidade pública
--     não exige nenhuma mudança nas funções existentes.
--     Mapa: trialing→trial · active/past_due/suspended→active · canceled→canceled
--     (suspended mantém a página no ar de propósito; só o painel bloqueia.)

-- O enum subscription_status já existe desde o schema base (0001), sem o
-- valor 'suspended'. Em produção este ALTER foi executado fora de transação.
alter type public.subscription_status add value if not exists 'suspended' after 'past_due';

-- Remove o rascunho de billing do schema base, nunca usado pelo código
-- (tenant_subscriptions/subscription_plans, ambas vazias) — a tabela
-- subscriptions abaixo é a fonte única.
drop table if exists public.tenant_subscriptions;
drop table if exists public.subscription_plans;

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  plan text not null default 'starter' check (plan in ('starter', 'plus')),
  status public.subscription_status not null default 'trialing',
  price_cents integer not null default 4990 check (price_cents >= 0),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  -- Identificadores do gateway (Mercado Pago), preenchidos na integração.
  mp_preapproval_id text,
  mp_payer_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_barbershop_key unique (barbershop_id)
);

create index subscriptions_status_idx on public.subscriptions (status);
create index subscriptions_mp_preapproval_idx
  on public.subscriptions (mp_preapproval_id) where mp_preapproval_id is not null;

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

-- Membros leem a assinatura da própria barbearia (para o painel).
-- Escritas só via funções definer, webhook e service role (super-admin).
create policy "members can view own subscription"
on public.subscriptions for select to authenticated
using ((select public.is_barbershop_member(barbershop_id)));

-- ── Espelho operacional em barbershops.status ───────────────────────────────
create or replace function public.sync_barbershop_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.barbershops
  set status = case new.status
      when 'trialing' then 'trial'::public.barbershop_status
      when 'canceled' then 'canceled'::public.barbershop_status
      else 'active'::public.barbershop_status
    end,
    plan = new.plan
  where id = new.barbershop_id;
  return new;
end;
$$;
revoke all on function public.sync_barbershop_status() from public, anon, authenticated;

create trigger sync_barbershop_status_on_subscription
  after insert or update of status, plan on public.subscriptions
  for each row execute function public.sync_barbershop_status();

-- ── Backfill: barbearias existentes viram assinaturas ativas (30 dias) ──────
insert into public.subscriptions (barbershop_id, plan, status, price_cents, current_period_end)
select b.id, b.plan, 'active',
       case when b.plan = 'plus' then 9990 else 4990 end,
       now() + interval '30 days'
from public.barbershops b
on conflict (barbershop_id) do nothing;

-- ── create_barbershop v2: aceita o plano e abre o trial de 7 dias ───────────
create or replace function public.create_barbershop(p_name text, p_slug text, p_plan text)
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

  select p.id into profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid();
  if profile_id is null then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.barbershops (name, slug, plan)
  values (clean_name, clean_slug, clean_plan)
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

revoke all on function public.create_barbershop(text, text, text) from public, anon;
grant execute on function public.create_barbershop(text, text, text) to authenticated;

-- Compatibilidade: a assinatura antiga (2 argumentos) delega para a nova,
-- para não quebrar deploys em trânsito.
create or replace function public.create_barbershop(p_name text, p_slug text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.create_barbershop(p_name, p_slug, 'starter');
$$;
revoke all on function public.create_barbershop(text, text) from public, anon;
grant execute on function public.create_barbershop(text, text) to authenticated;
