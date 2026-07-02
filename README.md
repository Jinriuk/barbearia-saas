# NexoBarber — SaaS para barbearias

Novo sistema criado em pasta separada do legado PHP. O legado permanece em `../barbearia/`
e foi usado somente como referência funcional.

## O que existe

- Next.js 16 App Router + React 19 + TypeScript strict;
- Tailwind 4 e shadcn/ui;
- Supabase Auth, PostgreSQL, Storage e SSR por cookies;
- schema multi-tenant com `barbershop_id`, FKs compostas e RLS;
- conflito de agenda bloqueado por exclusion constraint GiST;
- autenticação, onboarding, dashboard e CRUD inicial;
- página pública white label e reserva transacional;
- migrations, seed seguro de demonstração e documentação.

Módulos de estoque/financeiro/comissões têm schema e RLS preparados, mas a UI operacional
fica deliberadamente no roadmap até o MVP de agenda ser homologado.

## Requisitos

- Node.js 20.9+;
- npm;
- projeto Supabase.

## Configuração

```bash
cp .env.example .env.local
npm install
npm run dev
```

No Windows PowerShell, copie o arquivo manualmente se `cp` não estiver disponível.

Preencha as três variáveis públicas. A `service_role` não é necessária para o fluxo normal
e nunca pode ter prefixo `NEXT_PUBLIC_`.

## Banco

Com a Supabase CLI:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Execute `supabase/seed.sql` apenas em desenvolvimento. A demonstração pública ficará em
`/aurora`.

## Verificações

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

## Estrutura

- `src/app`: rotas e handlers;
- `src/modules`: ações/queries por domínio;
- `src/lib`: Supabase, auth, validação, permissões e erros;
- `src/components`: UI, layout, formulários e página pública;
- `supabase/migrations`: schema, RLS, RPCs e Storage;
- `docs`: análise, arquitetura, segurança, QA e deploy.

## Segurança

O proxy renova a sessão e faz redirect otimista; o acesso real é revalidado no DAL, em
Server Actions/Route Handlers e no PostgreSQL via RLS. A API pública não recebe
`barbershop_id`, duração, hora final ou status do navegador.

Comece por [análise do legado](docs/01-analise-legado.md), [arquitetura](docs/02-arquitetura.md)
e [deploy](docs/09-deploy.md).
