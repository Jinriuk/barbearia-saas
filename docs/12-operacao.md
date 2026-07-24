# 12 — Operação, observabilidade e métricas (Fase 6)

> Runbook mínimo + definições de métricas. Esta fase é contínua — este
> documento é o ponto de partida e deve evoluir a cada release.

## Monitoramento

| O quê                     | Como                                                                                                 | Sinal de problema                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Cron da régua de cobrança | Painel de crons da Vercel — a rota devolve 500 quando qualquer passo falha (nunca finge sucesso)     | Execução FALHA ou counts zerados por muitos dias        |
| Cron de lembretes         | Idem; loga `cron.reminders.*`                                                                        | `sent` sempre 0 com WhatsApp configurado                |
| Webhook de pagamentos     | Tabela `billing_events` (status `failed` + coluna `error`) e logs `webhook.payments.*`               | Eventos `failed` acumulando; `AMOUNT_MISMATCH` repetido |
| Logs estruturados         | `src/lib/log.ts` (JSON com evento + contexto, sem PII) via Vercel Logs                               | Erros `*.step_failed` / `*.persist_failed`              |
| Auditoria                 | `audit_logs` (ações manuais, cron `billing.cron_*`, webhook `billing.*`, expediente, estornos, demo) | Ausência de auditoria em mudança relevante = bug        |

## Runbook de incidente

1. **Página pública fora do ar para um tenant**: verifique
   `barbershops.status` (espelho de `subscriptions.status` via trigger).
   Cancelamento indevido → `reactivateSubscription` no admin ou corrija a
   assinatura e o trigger espelha.
2. **Reserva pública falhando**: reproduza via
   `POST /api/public/{slug}/appointments`; erros conhecidos voltam código
   legível (OUTSIDE_AVAILABILITY, SCHEDULE_BLOCKED, BOOKING_HORIZON_EXCEEDED,
   TOO_MANY_PENDING…). 429 = rate limit (tabela `rate_limit_buckets`).
3. **Divergência financeira**: `income_summary` é a fonte; confira
   transações do atendimento (`financial_transactions.appointment_id`).
   Nunca apague transação — use `revert_income_payment` /
   `cancel_income_transaction` (auditados).
4. **Webhook rejeitando provedor**: confira relógio (timestamp ±5 min) e
   segredo compartilhado; o motivo exato sai em `webhook.payments.rejected`.
5. **Restauração**: backups/PITR do Supabase (plano do projeto define a
   janela). Teste de restauração e rotação de segredos: agendar
   trimestralmente — pendência aberta.

## Checklist de release (toda entrega)

- `npm run lint && npm run typecheck && npm test && npm run build`;
- suítes SQL de `supabase/tests/` num banco local/staging
  (vistoria + fase0–fase4);
- migrations aplicadas ANTES do deploy que as consome (ou junto, quando o
  código antigo é compatível — checar a nota de cada entrega em
  `docs/entregas/`);
- `docs/11-matriz-funcionalidades.md` atualizada — nada anunciado que não
  esteja `operacional`.

## Métricas de produto

**North Star**: barbearias que completam semanalmente o ciclo
agenda → atendimento → pagamento → ação de retorno.

Instrumentação disponível hoje (sem PII):

- `lead_submitted` (Vercel Analytics, landing);
- `saas_leads.funnel_stage` (banco);
- atividade operacional derivável do banco por tenant: agendamentos criados
  (`appointments.source`), concluídos, transações pagas, contatos de retorno
  (`client_contacts`) e resultado (`agendou`).

Auxiliares definidas (§12.3 do plano): visita→lead, lead→cadastro,
cadastro→onboarding, tempo até publicar página, primeiro agendamento,
taxa de falta, contato→novo agendamento, trial→pago, churn, divergência
financeira (recebido sem método = 0 por construção), falhas de webhook,
mensagens duplicadas (= 0 por idempotência). Dashboards dedicados: pendência
aberta (exige escolha de ferramenta de analytics de produto).

## Pesquisa (contínua)

Entrevistar 10–15 proprietários; acompanhar 3–5 barbearias piloto; observar
o balcão; não construir IA antes de dados suficientes. Registrar achados
neste documento.
