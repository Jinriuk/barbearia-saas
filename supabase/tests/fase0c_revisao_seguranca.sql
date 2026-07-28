-- Fase 0 — revisão de segurança (migration 202607280031).
-- Rodar após a migration. Transação com ROLLBACK.
--
-- Prova que os dois desvios da reautenticação do §0.15 estão fechados:
--  1) quem está logado NÃO consegue emitir a concessão de recuperação
--     (`issue_password_recovery_grant` é só do service_role) — se conseguisse,
--     bastaria chamá-la pela API REST com a sessão do dono aberta no balcão;
--  2) quem está logado NÃO consegue marcar o próprio perfil como
--     "precisa trocar senha", que era o outro caminho para trocar a senha sem
--     informar a atual;
--  3) limpar a marca continua permitido (quem limpa já sabe a senha);
--  4) a concessão emitida pelo service_role é aceita, vale uma vez só e
--     expira.
-- E os dois erros de borda do §0.2:
--  5) cancelar assinatura vencida não devolve data no passado;
--  6) reativar plano já encerrado falha em vez de mentir "reativado".
\set ON_ERROR_STOP on
\pset pager off

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('cccc1111-1111-1111-1111-111111111111', 'colab@teste.com',
   '{"name": "Colaborador Teste"}'::jsonb);
insert into public.barbershops (id, name, slug) values
  ('cccc3333-3333-3333-3333-333333333333', 'Barbearia C', 'barbearia-c');
insert into public.memberships (profile_id, barbershop_id, role, status)
select p.id, 'cccc3333-3333-3333-3333-333333333333', 'owner', 'active'
from public.profiles p where p.auth_user_id = 'cccc1111-1111-1111-1111-111111111111';

-- O dono criou o acesso com senha provisória (§0.17): quem escreve é o
-- service_role, e a trava deixa passar.
update public.profiles set must_change_password = true
where auth_user_id = 'cccc1111-1111-1111-1111-111111111111';

do $$
declare v boolean;
begin
  select must_change_password into v from public.profiles
  where auth_user_id = 'cccc1111-1111-1111-1111-111111111111';
  if not v then raise exception 'FALHOU: o service_role deveria conseguir marcar'; end if;
  raise notice 'OK — service_role marca a senha como provisória';
end;
$$;

-- A partir daqui, a sessão é do usuário comum.
set local role authenticated;
set local request.jwt.claim.sub = 'cccc1111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"cccc1111-1111-1111-1111-111111111111","role":"authenticated"}';

-- (1) Emitir concessão pela API REST tem de ser negado.
do $$
begin
  perform public.issue_password_recovery_grant('cccc1111-1111-1111-1111-111111111111', 30);
  raise exception 'FURO: usuário logado emitiu a própria concessão de recuperação';
exception
  when insufficient_privilege then
    raise notice 'OK — emitir concessão é exclusivo do service_role';
end;
$$;

-- (2) A coluna sai do alcance do UPDATE direto, nos dois sentidos: quem
-- decide é a RPC. Bloquear só a subida bastaria para a segurança, mas uma
-- regra sem exceção é mais fácil de auditar depois.
do $$
declare v boolean;
begin
  -- O update direto é engolido pela trava (não estoura, só não muda nada).
  update public.profiles set must_change_password = false
  where auth_user_id = 'cccc1111-1111-1111-1111-111111111111';
  select must_change_password into v from public.profiles
  where auth_user_id = 'cccc1111-1111-1111-1111-111111111111';
  if not v then
    raise exception 'FALHOU: update direto do usuário mexeu na coluna protegida';
  end if;
  raise notice 'OK — UPDATE direto do usuário não mexe em must_change_password';
end;
$$;

-- (3) Limpar pela RPC continua permitido: quem limpa já sabe a senha.
do $$
declare v boolean;
begin
  perform public.clear_must_change_password();
  select must_change_password into v from public.profiles
  where auth_user_id = 'cccc1111-1111-1111-1111-111111111111';
  if v then raise exception 'FALHOU: a RPC não limpou a marca'; end if;
  raise notice 'OK — clear_must_change_password baixa a marca';
end;
$$;

-- E não há como levantá-la de volta.
do $$
declare v boolean;
begin
  update public.profiles set must_change_password = true
  where auth_user_id = 'cccc1111-1111-1111-1111-111111111111';
  select must_change_password into v from public.profiles
  where auth_user_id = 'cccc1111-1111-1111-1111-111111111111';
  if v then
    raise exception 'FURO: usuário logado marcou o próprio perfil como "precisa trocar"';
  end if;
  raise notice 'OK — o usuário não levanta a marca';
end;
$$;

-- (4) Sem concessão e sem marca, a janela está fechada.
do $$
declare v boolean;
begin
  select public.has_password_recovery_grant() into v;
  if v then raise exception 'FURO: concessão existe sem ninguém ter emitido'; end if;
  raise notice 'OK — sem link de recuperação, não há janela';
end;
$$;

-- (5) Concessão emitida pelo service_role: aceita, e vale uma vez.
reset role;
do $$
begin
  perform public.issue_password_recovery_grant('cccc1111-1111-1111-1111-111111111111', 30);
end;
$$;
set local role authenticated;
set local request.jwt.claim.sub = 'cccc1111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"cccc1111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare v boolean;
begin
  select public.has_password_recovery_grant() into v;
  if not v then raise exception 'FALHOU: a concessão emitida não foi reconhecida'; end if;

  select public.consume_password_recovery_grant() into v;
  if not v then raise exception 'FALHOU: consumir a concessão devolveu falso'; end if;

  select public.has_password_recovery_grant() into v;
  if v then raise exception 'FURO: a concessão sobreviveu ao uso'; end if;
  raise notice 'OK — a concessão é aceita uma vez e some depois de usada';
end;
$$;

-- Concessão vencida não vale.
reset role;
do $$
begin
  insert into public.password_recovery_grants (auth_user_id, expires_at)
  values ('cccc1111-1111-1111-1111-111111111111', now() - interval '1 minute')
  on conflict (auth_user_id) do update set expires_at = excluded.expires_at;
end;
$$;
set local role authenticated;
set local request.jwt.claim.sub = 'cccc1111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"cccc1111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare v boolean;
begin
  select public.has_password_recovery_grant() into v;
  if v then raise exception 'FURO: concessão vencida ainda vale'; end if;
  raise notice 'OK — concessão vencida não abre a janela';
end;
$$;

-- (6) e (7) Bordas do cancelamento.
reset role;
insert into public.subscriptions
  (barbershop_id, plan, status, price_cents, current_period_end)
values
  ('cccc3333-3333-3333-3333-333333333333', 'starter', 'past_due', 4990,
   now() - interval '3 days')
on conflict (barbershop_id) do update
  set status = 'past_due', current_period_end = excluded.current_period_end;

set local role authenticated;
set local request.jwt.claim.sub = 'cccc1111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"cccc1111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare ends_at timestamptz;
begin
  select public.request_subscription_cancellation(
    'cccc3333-3333-3333-3333-333333333333', 'vencida') into ends_at;
  if ends_at < now() then
    raise exception 'FALHOU: assinatura vencida devolveu data no passado (%)', ends_at;
  end if;
  raise notice 'OK — cancelar assinatura vencida não promete data que já passou';
end;
$$;

do $$
begin
  perform public.revoke_subscription_cancellation('cccc3333-3333-3333-3333-333333333333');
  raise notice 'OK — reativar plano vigente funciona';
end;
$$;

reset role;
update public.subscriptions set status = 'canceled'
where barbershop_id = 'cccc3333-3333-3333-3333-333333333333';
set local role authenticated;
set local request.jwt.claim.sub = 'cccc1111-1111-1111-1111-111111111111';
set local request.jwt.claims = '{"sub":"cccc1111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
begin
  perform public.revoke_subscription_cancellation('cccc3333-3333-3333-3333-333333333333');
  raise exception 'FALHOU: reativou um plano já encerrado e disse que deu certo';
exception
  when sqlstate 'P0001' then
    if sqlerrm not like '%SUBSCRIPTION_ALREADY_CANCELED%' then
      raise exception 'erro inesperado: %', sqlerrm;
    end if;
    raise notice 'OK — reativar plano já encerrado falha em vez de mentir';
end;
$$;

rollback;
