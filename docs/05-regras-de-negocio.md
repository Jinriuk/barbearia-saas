# 05 — Regras de negócio

## Status de agendamento

- `pending`: criado e aguardando confirmação; bloqueia o intervalo;
- `confirmed`: confirmado; bloqueia o intervalo;
- `completed`: concluído; preserva a ocupação histórica;
- `canceled`: cancelado; não bloqueia;
- `no_show`: ausência; não bloqueia novas reservas futuras e preserva histórico.

## Criação

1. resolver barbearia ativa pelo slug;
2. confirmar serviço ativo e publicável;
3. confirmar profissional ativo, publicável e habilitado no serviço;
4. calcular `ends_at` pela duração customizada ou do serviço;
5. respeitar antecedência mínima;
6. converter instante para timezone IANA do tenant;
7. validar dia, janela de trabalho e alinhamento do slot;
8. negar overlap com bloqueios;
9. normalizar telefone e localizar/criar cliente no tenant;
10. inserir appointment em transação;
11. deixar a exclusion constraint arbitrar corrida;
12. registrar auditoria sem PII.

## Conflito

Dois intervalos conflitam quando:

```text
novo.início < existente.fim AND novo.fim > existente.início
```

O modelo usa intervalo semiaberto `[início, fim)`. A checagem de disponibilidade melhora a
mensagem, mas a constraint é a garantia definitiva.

## Remarcação e cancelamento

Remarcar deve validar novamente toda a disponibilidade e executar em transação. Cancelar
preenche `canceled_at` e motivo quando disponível. Regras de antecedência ficam em
`tenant_settings.cancellation_notice_minutes`.

## Cliente

Telefone normalizado é único por barbearia, não global. O mesmo telefone pode existir em
tenants distintos sem ligação automática. Um cadastro autenticado pode ser associado a
`profile_id`, mas o agendamento público não revela se o telefone já existia.

## Desativação

Serviço, profissional, cliente e produto são desativados por padrão. Histórico financeiro
e de agenda não é apagado. Delete físico é reservado a registros sem dependências e papéis
administrativos.

No MVP, um novo profissional recebe disponibilidade inicial de segunda a sábado, das
09h às 18h, e é vinculado aos serviços ativos. Um novo serviço é vinculado aos
profissionais ativos. Esses defaults tornam o booking utilizável imediatamente e serão
substituídos pelo editor semanal na próxima iteração.

## Datas

Instantes são UTC em `timestamptz`. Disponibilidade semanal é uma regra local (`time` +
weekday). Exibição e validação usam `barbershops.timezone`, com
`America/Sao_Paulo` como padrão.

## Verdade financeira (Fase 0)

Conceitos separados e nunca misturados nas telas:

| Conceito  | Significado                                                           |
| --------- | --------------------------------------------------------------------- |
| Vendido   | Serviço concluído ou produto entregue, independentemente do pagamento |
| Recebido  | Transação efetivamente paga, com `payment_method` e `paid_at`         |
| A receber | Venda realizada com transação ainda `pending`/`overdue`               |
| Despesa   | Saída registrada ou conta paga                                        |
| Lucro     | Recebido menos despesas pagas no período (regime de caixa)            |

Regras:

1. Concluir atendimento cria, de forma idempotente, **uma** transação de
   receita `pending` (trigger `sync_completed_appointment_income` + índice
   único por atendimento/categoria `service`). Sem `paid_at`, sem forma de
   pagamento.
2. O preço aplicado é congelado na conclusão: mudanças futuras no catálogo
   não alteram vendas passadas.
3. Receber exige forma de pagamento. O banco bloqueia transição nova de
   receita para `paid` sem `payment_method`
   (trigger `enforce_income_payment_method`) e `paid` sem `paid_at`
   (constraint). Transações pagas antes da Fase 0 sem método aparecem como
   "Não informado".
4. Estorno não apaga: `revert_income_payment` volta a transação para
   `pending` e registra em `audit_logs`. Cancelamento de venda pendente usa
   `cancel_income_transaction` (status `canceled` + auditoria).
5. Venda de produto: reserva → confirmação transacional
   (`confirm_product_sale`) que baixa o estoque e cria a receita `pending`;
   se a forma de pagamento for informada na mesma operação, a receita já
   nasce `paid`. Repetir a confirmação não duplica estoque nem receita.
6. Falta (`no_show`) e cancelamento não geram receita.
7. Relatórios derivam de `financial_transactions` (fonte de verdade), nunca
   de textos ou estados visuais.
8. **Lucro é regime de caixa**: recebido (paid_at no período) menos despesas
   pagas (paid_at no período). Decisão pendente para fase futura: visão por
   competência, desconto/acréscimo por atendimento.

## Agendamento público (Fase 0)

- A reserva pública nasce `pending`; a página diz "Solicitação enviada" e
  explica que a barbearia confirmará — nunca promete confirmação imediata.
- O endpoint público retorna apenas `reference` (código curto, ex.: `A7K2MC`)
  e `status`. O UUID interno e dados de outros clientes nunca saem.
- `appointments.public_reference` é único por barbearia e gerado por trigger.
- Modo de confirmação automática por barbearia é evolução futura; a
  interface deve sempre refletir o modo configurado.

## Público do serviço (Fase 0)

`services.audience` define quem vê e agenda:

- `public` — página e agendamento públicos;
- `members` — exclusivo de assinantes; enquanto os planos de clientes não
  existem, nunca aparece ao público geral;
- `internal` — apenas lançamento manual pelo balcão.

"Oculto" continua sendo `public_visible = false`. As RPCs públicas
(`get_public_barbershop`, `get_public_availability`,
`create_public_appointment`) filtram `audience = 'public'`.

## Retorno previsto do cliente (Fase 3)

Hierarquia (documentada também na migration 0026):

1. **≥3 visitas concluídas** → mediana dos intervalos entre visitas,
   limitada a 5–180 dias (confiança **alta**);
2. senão → `services.return_days` do último serviço concluído (confiança
   **baixa** — a interface sinaliza "poucas visitas");
3. senão → fallback de **30 dias**.

Cancelamento e falta nunca contam como visita. Cliente sem visita concluída
fica **sem previsão** (nunca é classificado como atrasado/perdido).

Segmentos (limites): **Para chamar** = retorno previsto já passou + sem
contato nos últimos 14 dias + sem opt-out; **Próximos do retorno** =
previsto para os próximos 7 dias; **Em atraso** = previsto já passou;
**Sem voltar há 60 dias** = última visita concluída há ≥60 dias.
Contato registrado em `client_contacts` (canal + resultado, nunca o
conteúdo da conversa); resultado "não quer contato" liga o opt-out do
cliente e interrompe qualquer régua.
