# 06 — Segurança

## Controles implementados

- Supabase Auth; nenhuma senha em tabela da aplicação;
- SSR por cookies com renovação de sessão;
- autorização em página/action/handler e RLS;
- `barbershop_id` obrigatório e FK composta;
- inputs validados com Zod;
- agendamento público por RPC transacional;
- exclusion constraint contra corrida;
- RPCs `security definer` com `search_path = ''` e grants mínimos;
- service role isolada em módulo `server-only`;
- buckets com MIME, tamanho e policies por path/tenant;
- auditoria para criação de tenant e agendamento público;
- erros públicos por código de domínio;
- variáveis de ambiente documentadas.

## Segredos

Somente `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` podem chegar ao
bundle. `SUPABASE_SERVICE_ROLE_KEY` é opcional e exclusivamente server-side. Nunca logar
env, access token, refresh token, senha ou payload completo.

## Autenticação

Confirmação de e-mail e recuperação usam os fluxos do Supabase. O proxy renova cookies,
mas não é autoridade: rotas protegidas validam `getUser()` no servidor e o banco aplica
RLS.

## CSRF

Server Actions e sessão SameSite reduzem a superfície; Route Handlers mutáveis verificam
origem quando dependem de cookies. Webhooks não usam cookies: exigem assinatura do
provedor, timestamp e idempotência.

## Uploads

- tipos permitidos no bucket e novamente no servidor;
- limite de tamanho;
- nome aleatório gerado pelo servidor;
- prefixo obrigatório `barbershop_id/finalidade`;
- imagens públicas separadas de documentos privados;
- URL assinada para privados;
- não confiar em extensão ou nome original.

## API pública

Aplicar rate limiting na borda/Upstash antes da produção. A RPC pública não retorna
cadastro por telefone, não aceita `barbershop_id` fornecido pelo cliente e não permite
definir duração, `ends_at`, status ou preço.

## Checklist

- [ ] confirmação de e-mail habilitada;
- [ ] redirect URLs restritas;
- [ ] RLS testada com anon/authenticated;
- [ ] service role ausente do bundle;
- [ ] projetos separados para preview/produção;
- [ ] rate limit em login e booking;
- [ ] logs sem PII;
- [ ] backups e PITR avaliados;
- [ ] rotação de chaves documentada;
- [ ] alertas de auth/DB configurados;
- [ ] CORS/origins restritos;
- [ ] headers de segurança validados;
- [ ] buckets privados testados;
- [ ] dependências auditadas;
- [ ] resposta de incidente e contato definidos.
