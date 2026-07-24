-- Fase 6 — índices orientados pelas consultas novas das fases 0–4
-- (evidência: planos das RPCs income_summary e get_client_insights e das
-- listagens da agenda/financeiro por janela).

begin;

-- get_client_insights: varredura de visitas concluídas por cliente.
create index if not exists appointments_client_completed_idx
  on public.appointments (barbershop_id, client_id, starts_at)
  where status = 'completed';

-- Agenda por janela + status (visões Dia/Semana e filtros).
create index if not exists appointments_window_idx
  on public.appointments (barbershop_id, starts_at, status);

-- income_summary: vendido por created_at; recebido/despesas por paid_at;
-- a receber por status.
create index if not exists ft_type_status_created_idx
  on public.financial_transactions (barbershop_id, type, status, created_at);
create index if not exists ft_type_status_paid_idx
  on public.financial_transactions (barbershop_id, type, status, paid_at);

-- Reservas pendentes de produto (card da agenda).
create index if not exists apr_pending_idx
  on public.appointment_products (barbershop_id, created_at desc)
  where status = 'pending';

commit;
