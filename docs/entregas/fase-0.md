# Entrega da Fase 0 — Verdade operacional, financeira e segurança

> Data: 2026-07-23/24 · Branch `claude/system-analysis-planning-vbypfc`

## Resultado

- Concluir atendimento cria **uma** receita de serviço **pendente** (sem
  `paid_at`, sem forma de pagamento). Vendido ≠ recebido em todo o sistema.
- Receber exige forma de pagamento: constraint (`paid` ⇒ `paid_at`) +
  trigger que bloqueia transição nova de receita para `paid` sem método.
  Dados históricos pagos sem método aparecem como "Não informado".
- Estorno deixou de apagar a transação: `revert_income_payment` volta a
  `pending` e grava em `audit_logs`; `cancel_income_transaction` cancela
  venda pendente com auditoria.
- Venda de produto segue transacional (baixa + receita na mesma RPC), agora
  com receita pendente por padrão e captura opcional do pagamento na
  confirmação. A checagem de saldo (INSUFFICIENT_STOCK) foi preservada.
- Agendamento público honesto: os chips "Confirmação na hora" foram
  substituídos por "A barbearia/O salão confirma seu horário"; a tela final
  diz "Solicitação enviada", mostra **referência curta** e status
  "Aguardando confirmação"; o endpoint retorna `{reference, status}` sem
  expor o UUID interno.
- Bug operacional corrigido: cancelar agendamento no painel violava
  `appointments_cancellation_consistency` (ninguém enviava `canceled_at`) e
  falhava em silêncio — trigger agora preenche o campo.
- Regra de público do serviço (`audience`: public/members/internal),
  filtrada em `get_public_barbershop`, `get_public_availability` e
  `create_public_appointment`; select no formulário de serviço e badges na
  listagem.
- Demo de produção corrigida (tenant Barbearia Aurora): "Bruno Teste QA" →
  "Bruno"; "Cliente Teste QA" → "Carlos Andrade"; "Corte assinatura" de
  R$ 0,00 → R$ 65,00; "Assinatura mensal" fora do catálogo público. Registro
  em `audit_logs` (`demo.cleanup`).
- Rate limit compartilhado entre instâncias serverless via Postgres
  (`consume_rate_limit`, executável só pelo service_role), aplicado à
  reserva pública com degradação segura para o limite em memória.
- `seed.sql` com trava: aborta se o banco contiver tenants reais.
- Painel: Financeiro com cards **Vendido no mês / Recebido no mês /
  A receber / Atendimentos concluídos**, seção "A receber" com recebimento
  (método) e cancelamento auditado; Dashboard com card "A receber";
  recebimento de contas a receber pede forma de pagamento.
- Matriz de funcionalidades publicada (`docs/11-matriz-funcionalidades.md`)
  e regras de negócio atualizadas (`docs/05-regras-de-negocio.md`).

## Arquivos alterados

- `supabase/migrations/202607230022_fase0_verdade_financeira.sql` (nova)
- `supabase/seed.sql` · `supabase/tests/vistoria.sql` ·
  `supabase/tests/fase0_financeiro.sql` (novo)
- `src/modules/financial/actions.ts` · `src/modules/product-sales/actions.ts`
  · `src/modules/bills/actions.ts` · `src/modules/services/actions.ts`
- `src/app/api/public/[tenant]/appointments/route.ts` · `src/lib/rate-limit.ts`
  (+ teste) · `src/lib/financial/index.ts` (+ teste) ·
  `src/lib/validators/entities.ts` · `src/lib/verticals.ts`
- `src/components/public-site/booking-form.tsx` ·
  `src/app/(public)/[tenant]/page.tsx` ·
  `src/app/(public)/[tenant]/agendar/page.tsx`
- `src/app/(dashboard)/financeiro|dashboard|relatorios|servicos|contas-a-receber`
  · `src/app/(print)/relatorio-financeiro/page.tsx`
- `src/components/dashboard/bills-view.tsx` · `reservation-actions.tsx` ·
  `service-form-sheet.tsx`
- `docs/05-regras-de-negocio.md` · `docs/11-matriz-funcionalidades.md` (novo)

## Banco de dados

- Migration `202607230022` (re-aplicável): receita pendente na conclusão;
  constraint `financial_transactions_paid_requires_paid_at` (com backfill
  defensivo de `paid_at`); trigger `enforce_income_payment_method`;
  `confirm_product_sale(uuid, payment_method)` (mantém trava de estoque);
  trigger de `canceled_at`; `appointments.public_reference` (backfill +
  índice único por tenant + trigger); `services.audience` (+ filtros nas 3
  RPCs públicas); `income_summary` (security invoker); tabela
  `rate_limit_buckets` (RLS sem policies) + `consume_rate_limit`
  (service_role); RPCs `revert_income_payment` e
  `cancel_income_transaction` (auditoria); drop das sobrecargas antigas de
  `create_barbershop` (higiene apontada pelo advisor do Supabase).
- **Pendente**: aplicar a migration em produção **junto com o deploy do app**
  — o frontend antigo liquida contas a receber sem forma de pagamento e
  seria bloqueado pelo trigger novo.

## Regras de negócio

- Implementadas: tabela Vendido/Recebido/A receber; preço congelado na
  conclusão; lucro em regime de caixa; reserva pública sempre `pending` com
  referência; `audience` de serviço; forma de pagamento obrigatória para
  dinheiro novo.
- Pendentes (documentadas): desconto/acréscimo por atendimento; visão por
  competência; modo de confirmação automática por barbearia (Fase 2);
  planos de clientes (Fase 4).

## Testes executados

- `npm run lint` ✅ · `npm run typecheck` ✅ · `npm test` ✅ (44 testes, inclui
  novos `rate-limit.test.ts` e `financial.test.ts`) · `npm run build` ✅.
- `npm run format:check` ❌ **pré-existente** (31+ arquivos fora do padrão
  antes da fase; os arquivos tocados nesta fase foram formatados).
- **SQL (Postgres 16 local com shim Supabase — auth/storage/roles):** as 22
  migrations aplicam limpas do zero; `seed.sql` aplica com a trava passando;
  `supabase/tests/vistoria.sql` ✅ (RLS, escrita cruzada, receita pendente,
  venda com baixa, INSUFFICIENT_STOCK) e `supabase/tests/fase0_financeiro.sql`
  ✅ (8 blocos: pendência única e idempotente, Pix preenche método/paid_at,
  pago sem método bloqueado, estorno auditado sem apagar, cancelar/falta sem
  venda, reserva pública com referência+status, audience fora das RPCs
  públicas, isolamento financeiro entre tenants).
- Correções de teste encontradas na validação: a vistoria tinha um falso
  "OK" — a reserva de 99 unidades nunca era criada (conflito de unicidade) e
  o bloqueio de estoque não era exercitado; corrigido com atendimento
  próprio. Casts de `union all` corrigidos.
- `npm run test:e2e` **não executado**: exige app + Supabase locais com env
  configurado, indisponível neste ambiente. Registrar na homologação.

## Validação visual

- Não executada em navegador neste ambiente (sem env do Supabase para subir
  o app). As mudanças de UI reutilizam componentes/padrões existentes
  (cards ≤ grid responsivo já validado; formulários com select nativo ≥ 32px
  — altura h-8/h-10 nos pontos novos). Validar 360/768/1024/1440 px na
  homologação da Fase 1, que assume a reforma visual.

## Segurança

- Vistoria RLS re-executada com sucesso (dono A × tenant B, escrita cruzada,
  RPC de estorno cruzado nega com NOT_AUTHORIZED).
- `consume_rate_limit` executável apenas por service_role; tabela de buckets
  com RLS e sem policies.
- Advisor do Supabase (produção) revisado: warnings de SECURITY DEFINER
  expostos são **intencionais** (RPCs públicas de booking e helpers com
  checagem própria de papel); as sobrecargas antigas de `create_barbershop`
  apontadas foram removidas na migration.
- Nenhum segredo novo; nenhuma PII em logs novos (auditoria guarda valores e
  ids, não telefones).

## Riscos e limitações

- A migration muda o comportamento do trigger de conclusão: receitas novas
  nascem pendentes — o operador precisa confirmar o recebimento (a tela
  Financeiro guia isso). Comunicar à demo/beta.
- Frontend antigo + migration nova = liquidação de contas a receber
  bloqueada (sem método). Sequenciar deploy + migration juntos.
- Rate limit compartilhado adiciona 1 RPC por tentativa de reserva; em
  indisponibilidade do banco, degrada para o limite por instância (nunca
  bloqueia a jornada por falha interna).
- `sharedRateLimit` exige `SUPABASE_SERVICE_ROLE_KEY` no ambiente do app
  (já usada pelo admin client em outros fluxos).

## Rollback

- Nenhum dado é apagado. Para reverter comportamento: recriar
  `sync_completed_appointment_income`/`confirm_product_sale` nas versões da
  migration 0016, `drop trigger trg_enforce_income_payment_method`,
  `drop constraint financial_transactions_paid_requires_paid_at`. Colunas
  novas (`public_reference`, `audience`) podem permanecer sem uso.
- Demo: os quatro updates estão documentados em `audit_logs`
  (`demo.cleanup`) com valores anteriores no metadata desta entrega.

## Próxima fase

- Fase 1 (fundação visual, navegação, ativação, expediente) não depende de
  decisão externa; bloqueio zero.
- Dependência operacional: aplicar migration 0022 em produção junto do
  deploy desta branch (merge → deploy → `supabase db push`/apply).
