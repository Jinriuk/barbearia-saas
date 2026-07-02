# 02 — Arquitetura

## Decisão principal

O novo produto será um monólito modular em Next.js App Router com Supabase como backend
gerenciado. O navegador utiliza apenas a chave pública/anon; autorização é revalidada nos
Server Components, Server Actions/Route Handlers e, como barreira definitiva, nas
policies RLS do PostgreSQL.

O diretório é `barbearia-saas/` porque `../barbearia/` já contém o legado e deve permanecer
imutável.

## Stack

- Next.js 16+ com App Router e React 19;
- TypeScript strict;
- Tailwind CSS 4;
- componentes locais inspirados em shadcn/ui;
- Supabase Auth, PostgreSQL e Storage;
- `@supabase/ssr` para sessão por cookies;
- Zod para contratos;
- React Hook Form para formulários interativos;
- Vitest para regras puras;
- ESLint e Prettier;
- Vercel para frontend e funções.

## Organização

```text
src/
  app/                    # rotas, layouts, Server Components e handlers
  components/
    ui/                   # primitives visuais
    layout/               # shell, sidebar e cabeçalho
    dashboard/            # composições do painel
    forms/                # formulários client-side
    public-site/          # white label e booking
    feedback/             # empty/loading/error states
  modules/
    auth/
    barbershops/
    memberships/
    services/
    professionals/
    clients/
    appointments/
    settings/
    products/             # preparado para fase posterior
    inventory/
    financial/
    commissions/
    reports/
    subscriptions/
  lib/
    supabase/
    auth/
    permissions/
    validators/
    dates/
    errors/
    constants/
  hooks/
  types/
supabase/
  migrations/
  seed/
  schemas/
  policies/
  storage/
docs/
```

## Limites dos módulos

Cada módulo de domínio concentra schemas Zod, consultas, comandos e tipos. Páginas não
montam queries diretamente. Server Actions validam o payload, recuperam a identidade,
confirmam o membership e então executam a operação. RLS continua ativa mesmo no backend
autenticado.

O `service_role` só poderá existir em processos administrativos explicitamente isolados,
como webhook confiável, criação operacional controlada ou job. Ele nunca será importado
por Client Components nem terá prefixo `NEXT_PUBLIC_`.

## Estratégia multi-tenant

- `barbershops` é a raiz do tenant;
- toda entidade operacional contém `barbershop_id NOT NULL`;
- `memberships` relaciona profile, barbearia, papel e estado;
- o tenant ativo é escolhido por membership, nunca confiado a partir de um parâmetro;
- toda query administrativa filtra `barbershop_id`;
- toda FK composta sensível inclui o tenant ou é validada por trigger;
- funções `security definer` mínimas expõem apenas predicates de autorização;
- a página pública resolve somente `slug + status = active` e usa funções/RPCs públicas
  estritamente limitadas.

## Autenticação e onboarding

1. Supabase Auth cria a identidade e administra senha, confirmação e recuperação.
2. Trigger idempotente cria `profiles`.
3. O onboarding chama uma função transacional para criar barbearia, settings e membership
   `owner`.
4. O proxy apenas renova cookies e redireciona usuários anônimos por conveniência.
5. Cada página, action e handler protegido revalida `getUser()` e a permissão.

O proxy não é a única barreira de segurança.

## Autorização

Papéis iniciais:

- `owner`: controle completo do tenant;
- `manager`: operação e relatórios, sem assinatura e configurações críticas;
- `receptionist`: agenda, clientes e catálogos de leitura;
- `professional`: própria agenda, bloqueios autorizados e próprias comissões;
- `client`: próprios agendamentos, sem painel administrativo.

As permissões ficam em uma matriz TypeScript para experiência da interface e em predicates
SQL/policies para enforcement. A UI nunca é a autoridade.

## RLS

Todas as tabelas de negócio terão RLS habilitada e `FORCE ROW LEVEL SECURITY` quando
compatível. As policies utilizam:

- `auth.uid()` → `profiles.auth_user_id`;
- membership ativa no mesmo `barbershop_id`;
- papel necessário para mutação;
- vínculo de `professional.profile_id` para escopo próprio;
- vínculo de `clients.profile_id` para escopo do cliente.

Funções auxiliares evitam copiar joins complexos em cada policy. Elas fixam
`search_path = ''` e têm `execute` concedido apenas quando necessário.

## Agendamento sem conflito

- `starts_at` e `ends_at` são `timestamptz`;
- `ends_at > starts_at`;
- duração é calculada a partir do serviço no backend/RPC;
- range PostgreSQL `tstzrange(starts_at, ends_at, '[)')`;
- exclusion constraint GiST impede sobreposição por profissional para estados que
  bloqueiam agenda;
- cancelado e `no_show` não bloqueiam novos horários;
- a criação pública ocorre em uma função transacional que resolve tenant, serviço,
  profissional, cliente e horário;
- disponibilidade semanal e bloqueios são validados na mesma transação;
- conflitos retornam um erro de domínio amigável.

## Datas e timezone

Instantes são persistidos em UTC (`timestamptz`). Cada barbearia guarda um timezone IANA,
por padrão `America/Sao_Paulo`. Formulários enviam data/hora local mais timezone e o
backend converte para instante. A UI formata no timezone do tenant.

## Storage

Buckets separados:

- `public-assets`: logo, banner, profissionais e produtos publicados;
- `private-documents`: comprovantes e documentos futuros.

Paths começam com `barbershop_id/purpose/uuid.ext`. Policies validam membership e o
primeiro segmento do path. A aplicação valida MIME real permitido, extensão, tamanho,
finalidade e dimensão antes do upload. Arquivos privados são acessados por URL assinada.

## Renderização e cache

- dashboard: Server Components dinâmicos, sem cache compartilhado entre usuários;
- página pública: SSR/ISR somente para dados explicitamente públicos;
- mutations: Server Actions com validação e revalidação de path;
- endpoint de agendamento: Route Handler/RPC transacional, sem cache;
- webhooks: Route Handlers com verificação de assinatura e idempotência.

## Observabilidade e erros

- erros de domínio têm código estável e mensagem pública;
- detalhes internos ficam fora da resposta e não incluem PII;
- `audit_logs` registra alterações críticas com ator, tenant, entidade e metadados mínimos;
- health check confirma processo sem revelar configuração;
- nenhuma credencial ou payload completo é escrito no console.

## Deploy

- Vercel executa o Next.js;
- Supabase hospeda Auth, PostgreSQL e Storage;
- migrations são versionadas e aplicadas antes da promoção;
- preview usa projeto/branch separado ou banco isolado;
- variáveis públicas e privadas são separadas;
- a versão do Node segue o mínimo suportado pelo Next.js utilizado.

## Riscos e mitigação

| Risco                                | Mitigação                                                     |
| ------------------------------------ | ------------------------------------------------------------- |
| Vazamento entre tenants              | RLS, filtros explícitos, FKs com tenant e testes cruzados     |
| Bypass do proxy                      | autorização novamente na página/action/handler e RLS          |
| Corrida no agendamento               | exclusion constraint + função transacional                    |
| Chave de serviço vazada              | módulo server-only, sem prefixo público e auditoria de bundle |
| Cache compartilhando dados           | sem cache compartilhado para conteúdo autenticado             |
| Slug/domínio apontando tenant errado | resolução canônica e domínio único                            |
| Upload malicioso                     | buckets/policies, limite, MIME, extensão e path controlado    |
| Papel alterado pelo cliente          | somente owner autorizado e policy de memberships              |
| Horário convertido incorretamente    | timezone IANA por tenant e testes em UTC/local                |

## Decisões adiadas

- domínio customizado, billing real, mensageria WhatsApp, relatórios PDF, estoque e
  financeiro completos ficam após o núcleo do MVP;
- a modelagem dessas áreas existe para evolução, mas a UI não promete operação completa
  antes de migrations e regras próprias estarem validadas.

## Revisão crítica da fase

- o padrão único é `barbershop_id`;
- nenhuma autorização depende apenas de UI ou rota;
- o conflito de agenda tem garantia no banco;
- a chave de serviço fica restrita ao servidor;
- o projeto evita abstrações distribuídas e mantém módulos de domínio claros;
- a estrutura permite Vercel/Supabase sem acoplar o código ao legado;
- a modelagem e as policies devem ser implementadas antes do CRUD.
