# Supabase

Ordem:

1. aplique `migrations/` com Supabase CLI;
2. execute `seed.sql` somente em desenvolvimento;
3. gere os tipos com `supabase gen types typescript`;
4. teste as policies com usuários de tenants diferentes.

Nunca execute o seed em produção nem use `service_role` no navegador.
