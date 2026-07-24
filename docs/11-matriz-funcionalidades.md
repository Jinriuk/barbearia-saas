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

| Funcionalidade                                    | Estado      | Observações                                                                            |
| ------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| Vendido ≠ Recebido ≠ A receber                    | operacional | Fase 0: conclusão gera receita pendente; recebimento exige forma de pagamento.         |
| Confirmação de pagamento idempotente              | operacional | Índice único por atendimento + categoria service.                                      |
| Estorno auditado (sem apagar histórico)           | operacional | RPC `revert_income_payment` + `audit_logs`.                                            |
| Venda de produto transacional (estoque + receita) | operacional | RPC `confirm_product_sale`; receita nasce pendente, com captura opcional do pagamento. |
| Contas a pagar / a receber manuais                | operacional | Recebimento pede forma de pagamento.                                                   |
| Comissões e pagamento de equipe                   | beta        | Fonte de verdade da taxa (profissional × serviço) será unificada na Fase 4.            |
| Relatórios (tela + PDF)                           | operacional | Derivados de `financial_transactions`.                                                 |
| Lucro (recebido − despesas pagas)                 | beta        | Definição de caixa documentada; consolidação na Fase 4.                                |

## Clientes

| Funcionalidade                                           | Estado      | Observações |
| -------------------------------------------------------- | ----------- | ----------- |
| Cadastro e busca de clientes                             | operacional |             |
| Arquivar/restaurar cliente                               | operacional |             |
| Frequência, retorno previsto e segmentos ("para chamar") | planejado   | Fase 3.     |
| Histórico gerencial (gasto, última visita)               | planejado   | Fase 3.     |

## Catálogo e estoque

| Funcionalidade                                           | Estado      | Observações                                                                  |
| -------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| Serviços com preço, duração, categoria e profissionais   | operacional |                                                                              |
| Regra de público do serviço (público/assinantes/interno) | operacional | Fase 0: serviço não-público não aparece na página nem no agendamento online. |
| Produtos com estoque em ledger                           | operacional | Saldo derivado de `inventory_movements`.                                     |
| Upsell de produtos no agendamento (Plus)                 | operacional | Reserva → confirmação com baixa.                                             |
| Planos/assinaturas vendidos aos clientes da barbearia    | planejado   | Fase 4; serviços `members` ficam ocultos até lá.                             |

## Equipe e acessos

| Funcionalidade                                      | Estado      | Observações                    |
| --------------------------------------------------- | ----------- | ------------------------------ |
| Papéis (owner, manager, receptionist, professional) | operacional | RLS + permissões de interface. |
| Convite de membros                                  | operacional |                                |
| Agenda restrita do profissional                     | operacional | RLS `is_own_professional`.     |
| Metas e resultados por profissional                 | planejado   | Fase 4.                        |

## SaaS (NexoBarber)

| Funcionalidade                   | Estado      | Observações                                 |
| -------------------------------- | ----------- | ------------------------------------------- |
| Cadastro + onboarding + trial    | operacional |                                             |
| Assinatura com registro no banco | beta        | Estrutura existe; sem cobrança online real. |
| Checkout online (mensal/anual)   | planejado   | Fase 2B.                                    |
| Webhook de pagamento             | desativado  | Placeholder — não ativa conta. Fase 2B.     |
| Verticais barbearia/salão        | operacional | Campo `vertical`; landings separadas.       |

## Plataforma

| Funcionalidade                                | Estado      | Observações                                                                    |
| --------------------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| Isolamento multiempresa (RLS + FKs compostas) | operacional | Vistoria em `supabase/tests/vistoria.sql`.                                     |
| Rate limit compartilhado (Postgres)           | operacional | Fase 0: reserva pública; demais rotas usam limite em memória como 1ª barreira. |
| Páginas legais (termos/privacidade)           | operacional |                                                                                |
| Observabilidade (logs estruturados, alertas)  | planejado   | Fase 6.                                                                        |
