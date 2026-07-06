# 09 — Deploy

## Supabase

1. crie um projeto e registre região, senha forte e responsáveis;
2. instale a Supabase CLI em ambiente de desenvolvimento/CI;
3. vincule com `supabase link --project-ref ...`;
4. revise e aplique migrations com `supabase db push`;
5. não execute `seed.sql` em produção;
6. configure Site URL e Redirect URLs para produção e previews autorizados;
7. habilite confirmação de e-mail;
8. teste RLS com anon e usuários de cada papel;
9. confirme buckets e limites;
10. gere tipos TypeScript depois da migration.

## Variáveis

Copie `.env.example`. Na Vercel:

- `NEXT_PUBLIC_APP_URL`;
- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY` somente se uma rotina server-only realmente exigir;
- segredo de webhook quando billing for ativado.

Separe Preview e Production. Nunca reutilize banco produtivo em preview.

## Vercel

1. importe o repositório e defina Root Directory como `barbearia-saas`;
2. use Node compatível com Next.js 16;
3. configure variáveis por ambiente;
4. execute `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` na CI;
5. faça deploy de preview;
6. rode o checklist QA;
7. aplique migrations antes de promover código que dependa delas;
8. promova para produção e valide `/api/health`.

## Antes de abrir para clientes

- [ ] domínio e TLS;
- [ ] e-mail transacional e redirects;
- [ ] rate limit em auth/booking;
- [ ] backup/PITR;
- [ ] alertas e observabilidade;
- [ ] política de privacidade/LGPD e termos;
- [ ] processo de suporte e incidente;
- [ ] usuário de teste removido;
- [ ] seed não aplicado;
- [ ] auditoria npm limpa;
- [ ] RLS cruzada homologada.

## Subdomínio por barbearia (white label)

O proxy já suporta `SLUG.seudominio.com` apontando para a página pública do tenant.
Para ativar:

1. compre o domínio (ex.: `nexobarber.com.br`) e adicione na Vercel o domínio
   raiz **e** o wildcard `*.nexobarber.com.br` no projeto;
2. no DNS, crie `A/ALIAS` para o raiz e `CNAME *` → `cname.vercel-dns.com`;
3. defina `NEXT_PUBLIC_ROOT_DOMAIN=nexobarber.com.br` e atualize
   `NEXT_PUBLIC_APP_URL=https://nexobarber.com.br` nas variáveis do projeto;
4. faça um redeploy.

Subdomínios reservados (não viram tenant): `www`, `app`, `painel`, `admin`.
O painel e o login continuam no domínio raiz; o QR Code gerado em
Configurações passa a usar o novo domínio automaticamente.
