begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-assets',
  'public-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'private-documents',
  'private-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public assets are readable"
on storage.objects for select to public
using (bucket_id = 'public-assets');

create policy "members can upload tenant public assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'public-assets'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.has_barbershop_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','manager']::public.membership_role[]
  )
);

create policy "members can update tenant public assets"
on storage.objects for update to authenticated
using (
  bucket_id = 'public-assets'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.has_barbershop_role(
    (case
      when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end),
    array['owner','manager']::public.membership_role[]
  )
)
with check (
  bucket_id = 'public-assets'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.has_barbershop_role(
    (case
      when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end),
    array['owner','manager']::public.membership_role[]
  )
);

create policy "members can delete tenant public assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'public-assets'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.has_barbershop_role(
    (case
      when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end),
    array['owner','manager']::public.membership_role[]
  )
);

create policy "finance roles can read tenant private documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'private-documents'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.has_barbershop_role(
    (case
      when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end),
    array['owner','manager']::public.membership_role[]
  )
);

create policy "finance roles can upload tenant private documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'private-documents'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.has_barbershop_role(
    (case
      when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end),
    array['owner','manager']::public.membership_role[]
  )
);

create policy "finance roles can delete tenant private documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'private-documents'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.has_barbershop_role(
    (case
      when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      then (storage.foldername(name))[1]::uuid
      else null
    end),
    array['owner','manager']::public.membership_role[]
  )
);

commit;
