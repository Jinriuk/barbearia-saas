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

commit;
