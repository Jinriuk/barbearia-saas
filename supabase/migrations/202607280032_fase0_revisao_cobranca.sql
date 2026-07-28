-- Fase 0 — segunda rodada de revisão: o cancelamento agendado sobrevivia ao
-- pagamento.
--
-- Cenário: o dono pede o cancelamento em 01/ago (período até 30/ago). Muda de
-- ideia e, em vez de clicar em "Continuar com o plano", simplesmente PAGA a
-- renovação. O webhook estende o período e põe status 'active', mas ninguém
-- baixa `cancel_at_period_end` — e no fim do novo período a régua diária
-- encerra a assinatura de quem está pagando em dia, tirando a página pública
-- da barbearia do ar.
--
-- A trava fica no banco, e não no webhook, porque há mais de um caminho que
-- estende período: o webhook, o console do super-admin e o gateway que a
-- Fase 5 vai integrar. Quem paga, cancela o cancelamento.

begin;

create or replace function public.clear_cancellation_on_renewal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- O discriminador é o período ter sido ESTENDIDO — não o status ser
  -- 'active'. Pedir cancelamento não mexe em current_period_end, então o
  -- próprio pedido não se autoanula ao passar por aqui.
  if new.cancel_at_period_end
     and new.status = 'active'
     and new.current_period_end is distinct from old.current_period_end
     and new.current_period_end > now() then
    new.cancel_at_period_end := false;
    new.cancellation_requested_at := null;
    new.cancellation_reason := null;
    new.cancellation_effective_at := null;
  end if;
  return new;
end;
$$;
revoke all on function public.clear_cancellation_on_renewal()
  from public, anon, authenticated;

drop trigger if exists trg_clear_cancellation_on_renewal
  on public.subscriptions;
create trigger trg_clear_cancellation_on_renewal
before update on public.subscriptions
for each row
execute function public.clear_cancellation_on_renewal();

-- ─────────────────────────────────────────────────────────────────────────────
-- Receita anulada não pode condenar o atendimento.
--
-- A guarda de idempotência olhava qualquer receita de serviço do atendimento,
-- inclusive a ANULADA. Anular uma venda lançada por engano e reconcluir o
-- atendimento deixava o serviço prestado sem receita para sempre — e, agora
-- que a comissão acompanha a receita anulada (§0.9), sem comissão também.
-- A função é a da migration 202607240029, com a condição de status.
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
  v_membership_id uuid;
begin
  if new.status = 'completed' and (old.status is distinct from new.status) then
    -- `status <> 'canceled'` é a correção da Fase 0: a receita anulada não
    -- pode bloquear a geração de uma nova. Sem isso, anular uma venda lançada
    -- por engano e reconcluir o atendimento deixava o serviço prestado sem
    -- receita nenhuma para sempre — e, com a comissão amarrada à receita,
    -- sem comissão também.
    if exists (
      select 1 from public.financial_transactions
      where appointment_id = new.id and type = 'income' and category = 'service'
        and status <> 'canceled'
    ) then
      return new;
    end if;

    -- Cliente identificado com plano vigente cobrindo o serviço e uso
    -- disponível no período? Consome o benefício em vez de gerar receita.
    select m.id into v_membership_id
    from public.customer_memberships m
    join public.membership_entitlements e
      on e.plan_id = m.plan_id and e.service_id = new.service_id
    where m.barbershop_id = new.barbershop_id
      and m.client_id = new.client_id
      and m.status = 'active'
      and now() >= m.current_period_start
      and now() < m.current_period_end
      and (
        select count(*) from public.membership_usage u
        where u.membership_id = m.id
          and u.service_id = e.service_id
          and u.used_at >= m.current_period_start
          and u.used_at < m.current_period_end
      ) < e.uses_per_period
    limit 1;

    if v_membership_id is not null then
      insert into public.membership_usage
        (barbershop_id, membership_id, service_id, appointment_id)
      values
        (new.barbershop_id, v_membership_id, new.service_id, new.id)
      on conflict (appointment_id) do nothing;
      return new;
    end if;

    select s.price, s.name into v_service_price, v_service_name
    from public.services s where s.id = new.service_id;
    select c.name into v_client_name
    from public.clients c where c.id = new.client_id;
    if coalesce(v_service_price, 0) <= 0 then
      return new;
    end if;
    -- Vendido, ainda não recebido: sem paid_at e sem forma de pagamento.
    insert into public.financial_transactions
      (barbershop_id, type, status, category, description, amount,
       appointment_id, created_by)
    values
      (new.barbershop_id, 'income', 'pending', 'service',
       coalesce(v_service_name, 'Atendimento') || ' — ' ||
         coalesce(v_client_name, 'Cliente'),
       v_service_price, new.id, new.created_by);
  elsif old.status = 'completed' and new.status = 'confirmed' then
    -- Correção do balcão: devolve o uso do plano consumido pela conclusão.
    delete from public.membership_usage where appointment_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.sync_completed_appointment_income()
  from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Descadastro vale para a PESSOA, não para a linha.
--
-- O mesmo contato pode ter preenchido o formulário mais de uma vez (duas
-- landings, duas campanhas): cada envio é uma linha, cada linha tem seu token.
-- Dar baixa só na linha do token clicado deixaria a pessoa contatável pelas
-- outras — e ela entende que pediu para sair, não que saiu de um dos registros.
create or replace function public.unsubscribe_saas_lead(p_token text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_contact text;
begin
  if p_token is null or char_length(p_token) < 16 then
    return true;
  end if;

  select contact_normalized into v_contact
  from public.saas_leads
  where unsubscribe_token = p_token;

  if v_contact is null then
    return true; -- idempotente e mudo: não vira oráculo de token válido.
  end if;

  update public.saas_leads
  set opt_out_at = coalesce(opt_out_at, now()),
      funnel_stage = 'opted_out'
  where contact_normalized = v_contact;

  return true;
end;
$$;
revoke all on function public.unsubscribe_saas_lead(text)
  from public, authenticated;
grant execute on function public.unsubscribe_saas_lead(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- A data prometida e a data executada passam a ser a MESMA coluna.
--
-- Estavam sendo calculadas em dois lugares: a RPC devolvia
-- `greatest(coalesce(current_period_end, trial_ends_at), now())` para a tela, e
-- o cron decidia por `current_period_end <= now()`. Para quem está em atraso
-- essas duas contas divergem — o período já venceu, mas a régua ainda concede
-- tolerância (bloqueia em +5 dias, cancela em +15). O dono lia "seu acesso
-- continua até <data futura>" e o cron encerrava na madrugada seguinte,
-- derrubando a página pública ~12 dias antes do previsto.
--
-- Agora o fim efetivo é gravado no pedido e é ele que o cron consome. Cancelar
-- nunca antecipa o acesso que a régua já tinha concedido.
alter table public.subscriptions
  add column if not exists cancellation_effective_at timestamptz;

comment on column public.subscriptions.cancellation_effective_at is
  'Quando o cancelamento pedido pelo dono passa a valer. Fonte única: é o que a tela promete e o que o cron executa (Fase 0 §0.2).';

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
  v_grace constant integer := 15; -- CANCEL_AFTER_DAYS de src/lib/billing
begin
  if not public.has_barbershop_role(
    p_barbershop, array['owner']::public.membership_role[]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;

  update public.subscriptions s
  set cancel_at_period_end = true,
      cancellation_requested_at = coalesce(s.cancellation_requested_at, now()),
      cancellation_reason = nullif(trim(coalesce(p_reason, '')), ''),
      cancellation_effective_at = greatest(
        -- fim do que já foi pago...
        coalesce(s.current_period_end, s.trial_ends_at, now()),
        -- ...ou o fim da tolerância, para quem já está em atraso: pedir para
        -- sair não pode custar acesso que a régua já tinha dado.
        case
          when s.status in ('past_due', 'suspended')
            then coalesce(s.current_period_end, s.trial_ends_at, now())
                 + make_interval(days => v_grace)
          else now()
        end,
        now()
      )
  where s.barbershop_id = p_barbershop
    and s.status <> 'canceled'
  returning s.cancellation_effective_at into v_ends_at;

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
      cancellation_reason = null,
      cancellation_effective_at = null
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
