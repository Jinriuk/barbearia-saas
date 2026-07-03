# 03 — Banco de dados

## Convenções

- PostgreSQL/Supabase;
- UUID v4 para entidades públicas;
- `barbershop_id NOT NULL` em toda entidade operacional;
- `timestamptz` para instantes e `date`/`time` apenas para regras locais;
- valores monetários em `numeric(12,2)`;
- enums para estados finitos;
- nomes em inglês e `snake_case`;
- exclusão física restrita quando há histórico.

## Núcleo do MVP

`barbershops` é a raiz. `profiles` representa a pessoa autenticada, enquanto
`memberships` define em qual barbearia ela atua e com qual papel. A separação evita
misturar autenticação e autorização.

`services`, `professionals`, `clients`, `appointments` e `tenant_settings` formam o
núcleo operacional. `professional_services` restringe quais serviços cada profissional
executa; `professional_availability` e `schedule_blocks` compõem disponibilidade.

## Integridade por tenant

Entidades referenciadas possuem `UNIQUE (id, barbershop_id)`. FKs compostas em
agendamentos, estoque e financeiro garantem que um id de outro tenant não possa ser
associado, mesmo que a aplicação envie um payload incorreto.

Exemplo:

```sql
foreign key (professional_id, barbershop_id)
  references professionals(id, barbershop_id)
```

## Agenda

O intervalo é `[starts_at, ends_at)`, permitindo que um atendimento termine exatamente
quando o próximo começa. A exclusion constraint GiST impede overlap para o mesmo
`barbershop_id + professional_id` nos status `pending`, `confirmed` e `completed`.

Cancelados e faltas não bloqueiam agenda. Bloqueios são verificados pela RPC, e a
constraint continua protegendo a concorrência entre duas reservas simultâneas.

## Índices

Há índices para:

- membership por tenant/profile/status;
- catálogos ativos por tenant;
- cliente por tenant/nome e telefone normalizado único;
- agenda por tenant, profissional, cliente, status e início;
- disponibilidade por profissional/dia;
- bloqueios por profissional/início;
- auditoria por tenant/data;
- ledger de estoque e financeiro.

## Evolução pós-MVP

As tabelas `products`, `inventory_movements`, `suppliers`, `financial_transactions`,
`accounts_payable`, `accounts_receivable`, `commissions`, `subscription_plans` e
`tenant_subscriptions` já têm isolamento, integridade e RLS conservadora. As telas e
automações serão ativadas somente após testes específicos.

## Migrations

1. `202607020001_core_schema.sql`: tipos, tabelas, índices e triggers;
2. `202607020002_rls_and_functions.sql`: helpers, policies e RPCs;
3. `202607020003_storage.sql`: buckets e policies;
4. `seed.sql`: demonstração pública sem credenciais, apenas para desenvolvimento.

## Auditoria

`audit_logs` é append-only para clientes comuns. Ações críticas registram ator quando há
sessão, tenant, tipo/ID de entidade, ação e metadata mínima. Não se armazenam senha,
token, payload completo ou PII desnecessária.
