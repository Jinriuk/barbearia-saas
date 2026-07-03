begin;

-- Hardening: os default privileges do Supabase concedem EXECUTE a anon/authenticated
-- em toda função nova; "revoke from public" não remove grants por role.

-- Funções internas: somente usuários autenticados.
revoke execute on function public.create_barbershop(text, text) from anon;
revoke execute on function public.current_profile_id() from anon;
revoke execute on function public.is_barbershop_member(uuid) from anon;
revoke execute on function public.has_barbershop_role(uuid, public.membership_role[]) from anon;
revoke execute on function public.is_own_professional(uuid) from anon;
revoke execute on function public.is_own_client(uuid) from anon;

-- Funções de trigger: nenhum role da API precisa executá-las diretamente.
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated, service_role;
revoke execute on function public.set_updated_at() from public, anon, authenticated, service_role;

-- Extensão fora do schema public (lint 0014).
alter extension btree_gist set schema extensions;

-- Bucket público não precisa de policy de SELECT para servir URLs;
-- a policy ampla permitia listar todos os arquivos do bucket (lint 0025).
drop policy if exists "public assets are readable" on storage.objects;

-- Evita que futuras funções nasçam executáveis por anon por padrão.
alter default privileges in schema public revoke execute on functions from anon;

commit;
