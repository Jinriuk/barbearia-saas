# Entrega — Fase 4B: planos vendidos aos clientes

> Clube de assinatura da barbearia (ex.: "2 cortes por mês por R$ 89,90"),
> vendido e cobrado no balcão. Entregue **com** controle de uso e
> inadimplência, como o plano exige (§10.5).

## O que entrou

- **Banco** (migration `202607240029_fase4b_planos_clientes.sql`):
  `customer_membership_plans`, `membership_entitlements`,
  `customer_memberships`, `membership_payments`, `membership_usage` — todas
  com RLS e FKs compostas por tenant. RPCs auditadas:
  `sell_customer_membership`, `renew_customer_membership`,
  `set_customer_membership_status` (pause/resume/cancel) e
  `get_membership_overview` (situação efetiva + uso do período).
- **Benefício na conclusão**: `sync_completed_appointment_income` agora
  verifica plano em dia com uso disponível antes de gerar receita —
  serviço coberto consome 1 uso e não cobra de novo; desfazer a conclusão
  devolve o uso. Fora disso, o fluxo da Fase 0 permanece intacto.
- **UI `/planos`** (grupo Serviços e produtos, papel `clients:manage`):
  catálogo de planos (dono/gerente cria e edita serviços incluídos +
  limites), venda no balcão (cliente + plano + forma de pagamento),
  contratos com situação (Em dia / Vencido / Pausado), uso do período por
  serviço, renovação com forma de pagamento, pausar/retomar/cancelar e
  botão "Cobrar no WhatsApp" para vencidos (texto editável).

## Regras (docs/05 §Planos vendidos aos clientes)

Pré-pago (venda/renovação exigem pagamento), inadimplência derivada do
vencimento (sem cron), preço congelado na venda, renovação antecipada
estende do fim vigente, pausa suspende benefício sem esticar vigência,
cancelamento final, um plano em aberto por cliente.

## Validação

- `supabase/tests/fase4b_planos.sql`: 12 blocos verdes (venda, duplicada
  bloqueada, benefício consome uso sem receita, devolução no desfazer,
  limite de usos, serviço fora do plano, vencido/pausado cobram normal,
  overview marca vencido, renovação simples e antecipada, cancelamento
  final + recontratação, isolamento entre tenants).
- Regressão: vistoria + fase0–fase4 todas verdes (o trigger de receita foi
  recriado nesta fase).
- `npm run lint && npm run typecheck && npm test && npm run build` verdes.

## Deploy

A migration 0029 precisa ser aplicada em produção JUNTO do deploy deste
código (o código antigo não conhece as tabelas novas e não é afetado por
elas; o trigger novo é retrocompatível — sem contratos, comporta-se como o
da Fase 0).

## Fora desta entrega (registrado)

- Metas e resultados por profissional (continua `planejado` na matriz).
- Agendamento online identificado para assinante (serviço `members` segue
  fora da página pública; benefício é aplicado no balcão).
- Cobrança online do plano (depende do provedor de pagamento do SaaS).
