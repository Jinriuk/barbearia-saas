# Entrega da Fase 6 — Escala e observabilidade (contínua)

> Data: 2026-07-24 · Branch `claude/system-analysis-planning-vbypfc`

## Resultado

- **Runbook de operação** (`docs/12-operacao.md`): monitoramento de crons
  (falha real vira 500 no painel da Vercel), webhook via `billing_events`
  (status/erro), logs estruturados sem PII, auditoria; passos de incidente
  para página fora do ar, reserva falhando, divergência financeira e
  webhook rejeitado; checklist de release.
- **Métricas definidas**: North Star (ciclo semanal agenda → atendimento →
  pagamento → ação de retorno) + auxiliares, com o que já é mensurável
  hoje (evento de lead, funnel_stage no banco, atividade operacional por
  tenant). Divergência financeira e mensagens duplicadas são 0 por
  construção (constraints/idempotência).
- **Performance**: migration `202607240028` com índices orientados pelas
  consultas novas (visitas concluídas por cliente, janelas da agenda,
  somas por created_at/paid_at, reservas pendentes). Páginas de clientes e
  financeiro já agregam no banco (fases 3/4) — nada de agregação completa
  no navegador.

## Pendências abertas (fase contínua)

- Dashboards de erro e alerta ativos (escolha de ferramenta), teste de
  restauração de backup e rotação de segredos agendados, ambientes
  preview/produção formalizados, testes de carga com volume real.
