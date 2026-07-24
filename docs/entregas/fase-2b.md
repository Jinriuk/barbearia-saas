# Entrega da Fase 2B — Cobrança do SaaS e prontidão comercial mínima

> Data: 2026-07-24 · Branch `claude/system-analysis-planning-vbypfc`

## Resultado

- **Catálogo de preços no banco** (`plan_prices`, versionado por vigência):
  o preço saiu das constantes do frontend. Padrão R$ 49,90/mês ·
  R$ 499,00/ano; Plus R$ 99,90/mês · R$ 999,00/ano (anual = 10
  mensalidades, hipótese do plano §8.1). RPC pública `get_plan_catalog()`
  entrega a versão vigente; mudar preço = inserir versão nova, sem editar
  histórico. Landing (barber e salão), onboarding e /assinatura leem do
  catálogo (`loadPlanCatalog`, client sem cookies → landing continua
  estática com revalidação horária; constantes viram fallback).
- **Webhook de pagamentos real** (deixou de ser placeholder): assinatura
  HMAC-SHA256 com timestamp anti-replay (comparação em tempo constante),
  tabela `billing_events` com `provider_event_id` único (**evento repetido
  não duplica pagamento**), mapeamento explícito evento→ação
  (approved/renewed→ativa+período; failed/pending→past_due;
  chargeback→suspensa; canceled/refunded→cancelada; desconhecido→ignorado e
  registrado), valor conferido contra o catálogo (AMOUNT_MISMATCH não
  ativa), assinatura precisa existir (evento não cria conta), auditoria em
  `audit_logs`, e registro de erro sem PII.
- **Ciclo de vida**: cron diário agora **audita** cada transição automática
  (`billing.cron_*`) e normaliza assinatura ativa sem fim de período
  (fechava acesso perpétuo — apontado na análise).
- **/assinatura honesta**: mostra mensal e anual com economia em reais e a
  data/estado real; o botão falso "Mercado Pago — em breve" foi removido
  (§8.8: nada de botão "em breve" em fluxo anunciado).
- **Lead mínimo** (§8.5): tabela `saas_leads` (consentimento obrigatório,
  UTMs permitidas filtradas, canal WhatsApp/e-mail normalizado) + rota
  `POST /api/public/leads` com rate limit compartilhado. Lead não cria
  conta. A UI de captura entra na Fase 5 (landing).

## Decisão pendente (bloqueio externo)

- **Provedor de pagamento não contratado** (Mercado Pago? Stripe? Asaas?).
  O checkout self-service (§8.2) e a homologação de compra (§8.7-8.8) só
  podem ser concluídos com credenciais reais. Tudo o que independe do
  provedor está pronto: catálogo, webhook idempotente com contrato
  documentado (headers `x-webhook-timestamp` + `x-webhook-signature`,
  HMAC do corpo bruto), ciclo de vida e leads. Quando o provedor for
  escolhido, faltará: criar checkout/preapproval na API dele, mapear os
  eventos reais para os tipos internos e ativar a busca do evento na API
  antes de processar.

## Testes executados

- `npm run lint` ✅ · `npm run typecheck` ✅ · `npm test` ✅ (54 — inclui
  suíte nova do webhook: assinatura válida/ausente/adulterada/segredo
  errado/replay, mapeamento de eventos, dias por período) ·
  `npm run build` ✅ (rota `/api/public/leads`).
- **SQL:** `fase2b_cobranca.sql` ✅ — catálogo vigente e versionamento sem
  perder histórico; evento duplicado rejeitado pelo unique; anon lê
  catálogo mas não lê billing_events/saas_leads; membro lê a própria
  assinatura, não lê a alheia e não consegue alterá-la.

## Riscos e limitações

- `PAYMENTS_WEBHOOK_SECRET` precisa ser um segredo forte compartilhado com
  o provedor/gateway; sem ele a rota responde 503 (desligada).
- O processamento do webhook é inline (payload pequeno); fila/retentativa
  formal fica para a Fase 6 se o volume exigir.
- Preço exibido na landing usa ISR de 1h — mudanças de catálogo demoram até
  1h para aparecer lá (imediato no painel).

## Rollback

- Migration 0025 só cria tabelas novas (nenhuma alteração destrutiva);
  desativar = revogar grant de `get_plan_catalog` e voltar as páginas ao
  fallback (constantes). Webhook pode voltar ao stub revertendo o commit.

## Próxima fase

- Fase 3 (inteligência de clientes) sem bloqueios técnicos.
