-- Fase 4a: lembrete automático de horário via API oficial do WhatsApp
-- (número central da plataforma).
--
-- 1) appointments.reminder_sent_at marca que o lembrete daquele horário já
--    foi disparado — o cron roda todo dia e nunca manda duas vezes.
-- 2) tenant_settings.whatsapp_reminders_enabled permite o dono desligar o
--    disparo automático do próprio negócio (fica ligado por padrão).
--
-- O remetente hoje é o número central (envs do servidor). Quando a fase 4b
-- trouxer o "número próprio" por Embedded Signup, a configuração de
-- remetente entra em tenant_settings sem retrabalho neste rastreio.

alter table public.appointments
  add column if not exists reminder_sent_at timestamptz;

alter table public.tenant_settings
  add column if not exists whatsapp_reminders_enabled boolean not null default true;

-- O cron varre "horários de amanhã ainda sem lembrete": índice parcial
-- barato que cobre exatamente essa pergunta.
create index if not exists appointments_reminder_pending_idx
  on public.appointments (starts_at)
  where reminder_sent_at is null and status in ('pending', 'confirmed');
