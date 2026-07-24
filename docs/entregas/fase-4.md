# Entrega da Fase 4 (4A) — Gestão: comissões com fonte única e financeiro gerencial

> Data: 2026-07-24 · Branch `claude/system-analysis-planning-vbypfc`

## Resultado

- **Comissões — fonte de verdade única** (resolvia a contradição apontada
  no plano §10.2): precedência documentada e implementada —
  `services.commission_rate` **> 0** vale; senão vale a taxa padrão do
  profissional (`employee_pay_settings.commission_rate`). Os dois campos
  agora são editáveis na interface: comissão do serviço no formulário de
  serviço (antes coletada no cadastro do profissional e nunca usada) e
  taxa padrão em Financeiro → Comissões (card do profissional).
  Competência: serviços **concluídos** no período; a comissão é derivada
  (não persistida), então estorno/desfazer conclusão recalcula sozinho.
  Comissão de produto e desconto de taxas: decisão pendente registrada em
  docs/05.
- **Financeiro gerencial** (§10.1): resumo agora concilia tudo na mesma
  fonte (`income_summary` ampliada): Vendido, Recebido, A receber,
  **Despesas pagas** e **Lucro do mês (caixa = recebido − despesas
  pagas)**, com **comparação percentual vs mês anterior** (períodos
  equivalentes). As abas do financeiro são o grupo de navegação da Fase 1
  (Resumo e caixa / Despesas / A receber / Comissões / Relatórios), como o
  plano permite ("as rotas existentes podem continuar, agrupadas").
- Estados de serviço (§10.3) já entregues nas fases 0/3: ativo × visível ×
  público (audience) × retorno recomendado × comissão; desativar preserva
  histórico (regra pré-existente validada).
- Produtos/estoque (§10.4): ledger continua fonte única do saldo;
  concorrência e saldo insuficiente cobertos por teste desde a Fase 0.

## Decisão de escopo (4B — registrada)

- **Planos vendidos aos clientes da barbearia** ficam para a **Fase 4B**,
  como o próprio plano § 10.5 autoriza: "não entregar uma assinatura sem
  controle de uso e inadimplência". Pré-requisitos já prontos: serviços
  `audience = 'members'` nunca aparecem ao público geral e nunca exibem
  R$ 0; nomes de tabela sugeridos (`customer_membership_plans`, …)
  reservados no plano. Metas/resultados por profissional acompanham a 4B.

## Banco de dados

- Migration `202607240027`: `income_summary` recriada com
  `expenses_paid` e `profit` (regime de caixa).

## Testes executados

- `npm run lint` ✅ · `npm run typecheck` ✅ · `npm test` ✅ (54) ·
  `npm run build` ✅.
- **SQL:** `fase4_financeiro.sql` ✅ — vendido 160 / recebido 100 /
  a receber 60 / despesas 40 / lucro 60 na mesma janela.

## Riscos e limitações

- Profissionais cadastrados antes desta fase podem ter taxa padrão 0 e
  serviços com taxa 0: comissão calculada = 0 até o dono preencher um dos
  dois campos (a interface explica a precedência nos dois lugares).
- Exportação de relatórios com filtros (§10.1) permanece via página de
  impressão existente (PDF do mês); exportação CSV configurável fica para
  a Fase 6.

## Rollback

- Reverter o commit; a migration 0027 pode ser revertida recriando a
  versão da 0022 (3 colunas).

## Próxima fase

- Fase 5 (landing, leads e recuperação) — sem bloqueios; a rota de leads
  (Fase 2B) já está pronta para receber a UI.
