-- Fase 3 — Inteligência de clientes e retorno.
--
-- 1) clients.contact_opt_out: cliente que pediu para não ser contatado sai
--    da régua e do segmento "para chamar".
-- 2) client_contacts: log de cada contato iniciado (canal + resultado) —
--    mede contato → agendamento → retorno sem guardar o conteúdo privado
--    da conversa.
-- 3) get_client_insights: busca, segmentos e paginação NO SERVIDOR, com os
--    agregados por cliente (última visita concluída, frequência mediana,
--    retorno previsto, gasto) calculados no Postgres — a página deixa de
--    carregar a base inteira no navegador.
--
-- Regra de retorno (hierarquia documentada, §9.2):
--   1. ≥3 visitas concluídas → MEDIANA dos intervalos entre visitas
--      (limitada a 5–180 dias);
--   2. senão → services.return_days do último serviço concluído;
--   3. senão → fallback de 30 dias.
--   Confiança: alta (≥3 visitas), baixa (1–2), sem_historico (0 — nunca
--   classificado como atrasado/perdido).
-- Cancelamento e falta NUNCA contam como visita.

begin;

alter table public.clients
  add column if not exists contact_opt_out boolean not null default false;

create table if not exists public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  client_id uuid not null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'phone', 'email')),
  outcome text check (outcome in ('sem_resposta', 'respondeu', 'agendou', 'nao_quer_contato')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (client_id, barbershop_id)
    references public.clients(id, barbershop_id) on delete cascade
);

create index if not exists client_contacts_client_idx
  on public.client_contacts (barbershop_id, client_id, created_at desc);

alter table public.client_contacts enable row level security;

drop policy if exists "staff manage client contacts" on public.client_contacts;
create policy "staff manage client contacts"
on public.client_contacts for all to authenticated
using (
  public.has_barbershop_role(
    barbershop_id,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  )
)
with check (
  public.has_barbershop_role(
    barbershop_id,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Insights por cliente, paginado. security definer + checagem de papel
-- interna: manager/recepção veem os agregados (a página exige
-- clients:manage) sem depender da RLS restrita do financeiro.
create or replace function public.get_client_insights(
  p_barbershop uuid,
  p_segment text default 'todos',
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  name text,
  phone text,
  email text,
  active boolean,
  contact_opt_out boolean,
  last_completed_at timestamptz,
  days_since integer,
  completed_count bigint,
  total_spent numeric,
  avg_ticket numeric,
  top_service text,
  top_professional text,
  median_interval_days integer,
  expected_return_at timestamptz,
  confidence text,
  last_contact_at timestamptz,
  last_contact_outcome text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_phone_search text;
begin
  if not public.has_barbershop_role(
    p_barbershop,
    array['owner', 'manager', 'receptionist']::public.membership_role[]
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if p_segment not in ('todos', 'para_chamar', 'proximos', 'atrasados',
                       'sem_voltar_60', 'arquivados') then
    raise exception 'INVALID_SEGMENT' using errcode = 'P0001';
  end if;

  v_phone_search := regexp_replace(coalesce(v_search, ''), '\D', '', 'g');

  return query
  with visits as (
    select a.client_id,
           a.starts_at,
           a.service_id,
           a.professional_id,
           lag(a.starts_at) over (
             partition by a.client_id order by a.starts_at
           ) as prev_starts_at
    from public.appointments a
    where a.barbershop_id = p_barbershop and a.status = 'completed'
  ),
  agg as (
    select v.client_id,
           max(v.starts_at) as last_completed_at,
           count(*) as completed_count,
           percentile_cont(0.5) within group (
             order by extract(epoch from (v.starts_at - v.prev_starts_at)) / 86400
           ) filter (where v.prev_starts_at is not null) as median_days
    from visits v
    group by v.client_id
  ),
  spend as (
    select a.client_id,
           sum(ft.amount) as total_spent,
           count(ft.id) as paid_count
    from public.financial_transactions ft
    join public.appointments a on a.id = ft.appointment_id
    where ft.barbershop_id = p_barbershop
      and ft.type = 'income'
      and ft.status = 'paid'
    group by a.client_id
  ),
  contacts as (
    select distinct on (cc.client_id)
           cc.client_id, cc.created_at, cc.outcome
    from public.client_contacts cc
    where cc.barbershop_id = p_barbershop
    order by cc.client_id, cc.created_at desc
  ),
  enriched as (
    select
      c.id, c.name, c.phone, c.email, c.active, c.contact_opt_out,
      ag.last_completed_at,
      case when ag.last_completed_at is null then null
        else floor(extract(epoch from (now() - ag.last_completed_at)) / 86400)::integer
      end as days_since,
      coalesce(ag.completed_count, 0) as completed_count,
      coalesce(sp.total_spent, 0) as total_spent,
      case when coalesce(sp.paid_count, 0) = 0 then 0
        else round(sp.total_spent / sp.paid_count, 2)
      end as avg_ticket,
      case when ag.completed_count >= 3 and ag.median_days is not null
        then greatest(5, least(180, round(ag.median_days)))::integer
        else null
      end as median_interval_days,
      -- Hierarquia do retorno previsto (§9.2).
      case
        when ag.last_completed_at is null then null
        when ag.completed_count >= 3 and ag.median_days is not null then
          ag.last_completed_at
            + make_interval(days => greatest(5, least(180, round(ag.median_days)))::integer)
        else
          ag.last_completed_at + make_interval(days => coalesce((
            select s.return_days from public.appointments a2
            join public.services s on s.id = a2.service_id
            where a2.client_id = c.id and a2.barbershop_id = p_barbershop
              and a2.status = 'completed' and nullif(s.return_days, 0) is not null
            order by a2.starts_at desc limit 1
          ), 30))
      end as expected_return_at,
      case
        when coalesce(ag.completed_count, 0) = 0 then 'sem_historico'
        when ag.completed_count >= 3 then 'alta'
        else 'baixa'
      end as confidence,
      ct.created_at as last_contact_at,
      ct.outcome as last_contact_outcome
    from public.clients c
    left join agg ag on ag.client_id = c.id
    left join spend sp on sp.client_id = c.id
    left join contacts ct on ct.client_id = c.id
    where c.barbershop_id = p_barbershop
      and (v_search is null
        or c.name ilike '%' || v_search || '%'
        or (length(v_phone_search) >= 4
            and c.phone_normalized like '%' || v_phone_search || '%'))
  ),
  filtered as (
    select e.* from enriched e
    where case p_segment
      when 'arquivados' then not e.active
      when 'atrasados' then e.active and e.expected_return_at < now()
      when 'para_chamar' then e.active
        and e.expected_return_at < now()
        and not e.contact_opt_out
        and (e.last_contact_at is null or e.last_contact_at < now() - interval '14 days')
      when 'proximos' then e.active
        and e.expected_return_at >= now()
        and e.expected_return_at < now() + interval '7 days'
      when 'sem_voltar_60' then e.active and e.days_since >= 60
      else e.active
    end
  )
  select f.id, f.name, f.phone, f.email, f.active, f.contact_opt_out,
         f.last_completed_at, f.days_since, f.completed_count,
         f.total_spent, f.avg_ticket,
         -- Serviço/profissional habituais só para a página exibida (lateral
         -- barato: p_limit linhas, não a base inteira).
         (select s.name from public.appointments a3
            join public.services s on s.id = a3.service_id
            where a3.client_id = f.id and a3.barbershop_id = p_barbershop
              and a3.status = 'completed'
            group by s.name order by count(*) desc, s.name limit 1) as top_service,
         (select pr.name from public.appointments a4
            join public.professionals pr on pr.id = a4.professional_id
            where a4.client_id = f.id and a4.barbershop_id = p_barbershop
              and a4.status = 'completed'
            group by pr.name order by count(*) desc, pr.name limit 1) as top_professional,
         f.median_interval_days, f.expected_return_at, f.confidence,
         f.last_contact_at, f.last_contact_outcome,
         count(*) over () as total_count
  from filtered f
  order by
    case when p_segment in ('para_chamar', 'atrasados', 'proximos')
      then f.expected_return_at end asc nulls last,
    case when p_segment = 'sem_voltar_60' then f.days_since end desc nulls last,
    f.name asc
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;
revoke all on function public.get_client_insights(uuid, text, text, integer, integer)
  from public, anon;
grant execute on function public.get_client_insights(uuid, text, text, integer, integer)
  to authenticated;

-- Contagem do segmento "para chamar" para o dashboard orientado a ação.
create or replace function public.count_clients_to_call(p_barbershop uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select g.total_count
    from public.get_client_insights(p_barbershop, 'para_chamar', null, 1, 0) g
    limit 1
  ), 0)::integer;
$$;
revoke all on function public.count_clients_to_call(uuid) from public, anon;
grant execute on function public.count_clients_to_call(uuid) to authenticated;

commit;
