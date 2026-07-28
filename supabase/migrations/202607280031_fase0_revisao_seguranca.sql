-- Fase 0 — correções da revisão da própria Fase 0.
--
-- A revisão adversarial do diff de 202607280030 encontrou três furos na
-- reautenticação do §0.15 e dois erros de borda no cancelamento do §0.2.
-- Os dois primeiros anulavam o item inteiro:
--
--  1. A marca de "esta sessão veio de um link de recuperação" era um cookie
--     de valor fixo. Cookie é do navegador: quem está com a sessão do dono
--     aberta no aparelho do balcão cria esse cookie na mão pelo DevTools —
--     httpOnly impede o JavaScript da página, não a pessoa sentada ali — e
--     troca a senha sem saber a atual. A marca passa a ser uma concessão
--     guardada no banco, que só o service_role emite.
--
--  2. `profiles.must_change_password` também liberava a troca sem a senha
--     atual, e a policy de update do próprio perfil não restringe coluna:
--     bastava marcar a própria linha como true. A coluna sai do alcance do
--     usuário.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Concessão de recuperação de senha.
--
-- Emitida SÓ pelo callback do link de e-mail, depois de a troca do código ter
-- dado certo de verdade, e SÓ com service_role — se `authenticated` pudesse
-- emitir, quem tem a sessão do dono chamaria a função direto pela API REST e
-- estaríamos no mesmo lugar.
create table if not exists public.password_recovery_grants (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.password_recovery_grants enable row level security;
-- Sem policies de propósito: nem authenticated nem anon leem ou escrevem.
-- Todo acesso passa pelas funções abaixo.

create index if not exists password_recovery_grants_expires_idx
  on public.password_recovery_grants (expires_at);

/** Abre a janela de troca sem senha atual. Só o callback verificado chama. */
create or replace function public.issue_password_recovery_grant(
  p_auth_user_id uuid,
  p_minutes integer default 30
) returns timestamptz
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_expires timestamptz;
begin
  if p_auth_user_id is null then
    raise exception 'AUTH_USER_REQUIRED' using errcode = 'P0001';
  end if;

  v_expires := now() + make_interval(mins => greatest(1, least(60, p_minutes)));

  insert into public.password_recovery_grants (auth_user_id, expires_at)
  values (p_auth_user_id, v_expires)
  on conflict (auth_user_id) do update
    set expires_at = excluded.expires_at,
        created_at = now();

  -- Higiene barata: a tabela nunca cresce sozinha.
  delete from public.password_recovery_grants where expires_at < now();

  return v_expires;
end;
$$;
revoke all on function public.issue_password_recovery_grant(uuid, integer)
  from public, anon, authenticated;

/** A sessão atual está dentro da janela? Não recebe id: sempre o próprio. */
create or replace function public.has_password_recovery_grant()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.password_recovery_grants g
    where g.auth_user_id = auth.uid()
      and g.expires_at > now()
  );
$$;
revoke all on function public.has_password_recovery_grant() from public, anon;
grant execute on function public.has_password_recovery_grant() to authenticated;

/** Consome a concessão: vale uma troca só. */
create or replace function public.consume_password_recovery_grant()
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.password_recovery_grants
  where auth_user_id = auth.uid()
    and expires_at > now();
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;
revoke all on function public.consume_password_recovery_grant() from public, anon;
grant execute on function public.consume_password_recovery_grant() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. `must_change_password` fora do alcance de quem está logado.
--
-- A policy "users can update their profile" permite atualizar qualquer coluna
-- da própria linha. Sem esta trava, o colaborador (ou quem estiver com a
-- sessão de alguém aberta) marcava o próprio perfil como "precisa trocar" e
-- usava /atualizar-senha para trocar a senha sem informar a atual.
-- SECURITY INVOKER de propósito: precisa enxergar QUEM está escrevendo. Como
-- `security definer`, `current_user` seria sempre o dono da função e a trava
-- não travaria nada — e, pior, também barraria a RPC que limpa a marca.
create or replace function public.protect_must_change_password()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Escrita direta pela API REST chega como 'authenticated'/'anon'. Dentro de
  -- uma função security definer (a RPC que limpa a marca) e no service_role,
  -- `current_user` é outro e a escrita passa.
  if current_user in ('authenticated', 'anon')
     and new.must_change_password is distinct from old.must_change_password then
    new.must_change_password := old.must_change_password;
  end if;
  return new;
end;
$$;
revoke all on function public.protect_must_change_password()
  from public, anon, authenticated;

drop trigger if exists trg_protect_must_change_password on public.profiles;
create trigger trg_protect_must_change_password
before update on public.profiles
for each row
execute function public.protect_must_change_password();

/**
 * Baixa a marca depois de a pessoa ter realmente definido a própria senha.
 * Limpar é inofensivo (quem limpa já sabe a senha); o que precisava sair do
 * alcance do usuário era LEVANTAR a marca.
 */
create or replace function public.clear_must_change_password()
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  update public.profiles
  set must_change_password = false
  where auth_user_id = auth.uid()
    and must_change_password;
  return true;
end;
$$;
revoke all on function public.clear_must_change_password() from public, anon;
grant execute on function public.clear_must_change_password() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Cancelamento: data efetiva nunca no passado.
--
-- Para uma assinatura vencida, `coalesce(current_period_end, trial_ends_at)` é
-- uma data que já passou: a tela dizia "seu acesso continua até <ontem>" e o
-- cron cancelava na primeira execução. Quem está em atraso ainda tem a
-- tolerância antes do corte — o fim efetivo é o maior entre a data do período
-- e agora.
create or replace function public.request_subscription_cancellation(
  p_barbershop uuid,
  p_reason text default null
) returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ends_at timestamptz;
begin
  if not public.has_barbershop_role(
    p_barbershop, array['owner']::public.membership_role[]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  update public.subscriptions
  set cancel_at_period_end = true,
      cancellation_requested_at = coalesce(cancellation_requested_at, now()),
      cancellation_reason = nullif(trim(coalesce(p_reason, '')), '')
  where barbershop_id = p_barbershop
    and status <> 'canceled'
  returning greatest(
    coalesce(current_period_end, trial_ends_at, now()),
    now()
  ) into v_ends_at;

  if v_ends_at is null then
    raise exception 'SUBSCRIPTION_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.audit_logs
    (barbershop_id, actor_profile_id, action, entity_type, entity_id, metadata)
  values
    (p_barbershop, public.current_profile_id(), 'subscription.cancel_requested',
     'subscription', p_barbershop,
     jsonb_build_object('endsAt', v_ends_at, 'reason', p_reason));

  return v_ends_at;
end;
$$;
revoke all on function public.request_subscription_cancellation(uuid, text)
  from public, anon;
grant execute on function public.request_subscription_cancellation(uuid, text)
  to authenticated;

-- Reativar precisa dizer a verdade: se o cron já encerrou o plano enquanto a
-- aba estava aberta, "Plano reativado" seria mentira.
create or replace function public.revoke_subscription_cancellation(
  p_barbershop uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  if not public.has_barbershop_role(
    p_barbershop, array['owner']::public.membership_role[]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  update public.subscriptions
  set cancel_at_period_end = false,
      cancellation_requested_at = null,
      cancellation_reason = null
  where barbershop_id = p_barbershop
    and status <> 'canceled';
  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'SUBSCRIPTION_ALREADY_CANCELED' using errcode = 'P0001';
  end if;

  insert into public.audit_logs
    (barbershop_id, actor_profile_id, action, entity_type, entity_id)
  values
    (p_barbershop, public.current_profile_id(), 'subscription.cancel_revoked',
     'subscription', p_barbershop);

  return true;
end;
$$;
revoke all on function public.revoke_subscription_cancellation(uuid)
  from public, anon;
grant execute on function public.revoke_subscription_cancellation(uuid)
  to authenticated;

commit;
