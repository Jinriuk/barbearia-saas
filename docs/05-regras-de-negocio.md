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
