# 11 — Matriz de funcionalidades

> Fonte de verdade do que pode ser prometido em marketing, demo e vendas.
> Regra do plano (Fase 0): nada aparece na landing como operacional se estiver
> `beta`, `interno`, `planejado` ou `desativado`.
>
> Estados possíveis: `operacional` · `beta` · `interno` · `planejado` ·
> `desativado`.
>
> Última revisão: 2026-07-23 (Fase 0).

## Agenda e agendamento

| Funcionalidade                                               | Estado      | Observações                                                                                                              |
| ------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| Página pública personalizável por tenant                     | operacional | Cores, textos, fotos, seções.                                                                                            |
| Agendamento público com disponibilidade em tempo real        | operacional | RPC transacional com proteção de conflito.                                                                               |
| Reserva pública nasce pendente + referência pública          | operacional | Fase 0: a página informa que a barbearia confirma; endpoint retorna `reference` e `status`.                              |
| Confirmação automática configurável por barbearia            | operacional | Fase 1: modo manual/auto em Configurações; página pública reflete o modo.                                                |
| Lançamento manual pela equipe (balcão)                       | operacional | RPC `create_manual_appointment`, mesma disponibilidade da página.                                                        |
| Máquina de estados do atendimento                            | operacional | Fase 2: trigger no banco (transições + conclusão futura bloqueada); `in_progress` não implementado (decisão registrada). |
| Remarcação transacional pela equipe                          | operacional | Fase 2: RPC `reschedule_appointment`; conflito preserva o horário anterior.                                              |
| Cancelamento pelo cliente com token público                  | operacional | Fase 2: `/{slug}/reserva/{token}`, respeita antecedência; remarcar = cancelar + reservar (documentado).                  |
| "Primeiro profissional disponível"                           | operacional | Fase 2: RPC `get_first_available` avalia todos os profissionais de uma vez.                                              |
| Expediente por dia, folgas, férias e bloqueios (UI completa) | operacional | Fase 1: Equipe → Horários e folgas; RPC transacional com avisos.                                                         |
| Lembrete manual por WhatsApp (wa.me)                         | operacional | Um toque no dashboard/agenda.                                                                                            |
| Lembrete automático por WhatsApp (API oficial)               | beta        | Número central; exige configuração de credenciais da plataforma.                                                         |

## Financeiro

| Funcionalidade                                    | Estado      | Observações                                                                                                         |
| ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| Vendido ≠ Recebido ≠ A receber                    | operacional | Fase 0: conclusão gera receita pendente; recebimento exige forma de pagamento.                                      |
| Confirmação de pagamento idempotente              | operacional | Índice único por atendimento + categoria service.                                                                   |
| Estorno auditado (sem apagar histórico)           | operacional | RPC `revert_income_payment` + `audit_logs`.                                                                         |
| Venda de produto transacional (estoque + receita) | operacional | RPC `confirm_product_sale`; receita nasce pendente, com captura opcional do pagamento.                              |
| Contas a pagar / a receber manuais                | operacional | Recebimento pede forma de pagamento.                                                                                |
| Comissões e pagamento de equipe                   | operacional | Fase 4: fonte única com precedência serviço > profissional; competência = concluídos (derivada, estorno recalcula). |
| Relatórios (tela + PDF)                           | operacional | Derivados de `financial_transactions`.                                                                              |
| Lucro (recebido − despesas pagas)                 | operacional | Fase 4: resumo com despesas, lucro (caixa) e comparação com o mês anterior.                                         |

## Clientes

| Funcionalidade                                           | Estado      | Observações                                                                                  |
| -------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| Cadastro e busca de clientes                             | operacional | Fase 3: busca e paginação no servidor.                                                       |
| Arquivar/restaurar cliente                               | operacional |                                                                                              |
| Frequência, retorno previsto e segmentos ("para chamar") | operacional | Fase 3: mediana individual → return_days → 30d; segmentos com carência de contato e opt-out. |
| Histórico gerencial (gasto, última visita)               | operacional | Fase 3: agregados no banco (RPC paginada), gasto só de transações pagas.                     |

## Catálogo e estoque

| Funcionalidade                                           | Estado      | Observações                                                                     |
| -------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| Serviços com preço, duração, categoria e profissionais   | operacional |                                                                                 |
| Regra de público do serviço (público/assinantes/interno) | operacional | Fase 0: serviço não-público não aparece na página nem no agendamento online.    |
| Produtos com estoque em ledger                           | operacional | Saldo derivado de `inventory_movements`.                                        |
| Upsell de produtos no agendamento (Plus)                 | operacional | Reserva → confirmação com baixa.                                                |
| Planos/assinaturas vendidos aos clientes da barbearia    | planejado   | Fase 4B: não entregue sem controle de uso e inadimplência (decisão registrada). |

## Equipe e acessos

| Funcionalidade                                      | Estado      | Observações                    |
| --------------------------------------------------- | ----------- | ------------------------------ |
| Papéis (owner, manager, receptionist, professional) | operacional | RLS + permissões de interface. |
| Convite de membros                                  | operacional |                                |
| Agenda restrita do profissional                     | operacional | RLS `is_own_professional`.     |
| Metas e resultados por profissional                 | planejado   | Fase 4B.                       |

## SaaS (NexoBarber)

| Funcionalidade                             | Estado      | Observações                                                                                                                 |
| ------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| Cadastro + onboarding + trial              | operacional |                                                                                                                             |
| Catálogo de preços no banco (mensal/anual) | operacional | Fase 2B: plan_prices versionado; landing/onboarding/assinatura leem do banco com fallback.                                  |
| Captura de lead pré-checkout               | interno     | Fase 2B: tabela + rota com rate limit e consentimento; UI entra na Fase 5.                                                  |
| Assinatura com registro no banco           | operacional | Régua trial→past_due→suspended→canceled com auditoria no cron.                                                              |
| Checkout online (mensal/anual)             | planejado   | Bloqueado por decisão de provedor de pagamento; preços mensal/anual já exibidos do catálogo.                                |
| Webhook de pagamento                       | beta        | Fase 2B: HMAC + anti-replay + idempotência (billing_events) + preço conferido no catálogo; falta contratar o provedor real. |
| Verticais barbearia/salão                  | operacional | Campo `vertical`; landings separadas.                                                                                       |

## Plataforma

| Funcionalidade                                | Estado      | Observações                                                                    |
| --------------------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| Isolamento multiempresa (RLS + FKs compostas) | operacional | Vistoria em `supabase/tests/vistoria.sql`.                                     |
| Rate limit compartilhado (Postgres)           | operacional | Fase 0: reserva pública; demais rotas usam limite em memória como 1ª barreira. |
| Páginas legais (termos/privacidade)           | operacional |                                                                                |
| Observabilidade (logs estruturados, alertas)  | planejado   | Fase 6.                                                                        |
