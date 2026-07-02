begin;

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.barbershop_status as enum ('trial', 'active', 'past_due', 'suspended', 'canceled');
create type public.membership_role as enum ('owner', 'manager', 'receptionist', 'professional', 'client');
create type public.membership_status as enum ('invited', 'active', 'suspended');
create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'canceled', 'no_show');
create type public.inventory_movement_type as enum ('purchase', 'sale', 'adjustment_in', 'adjustment_out', 'loss', 'return');
create type public.financial_transaction_type as enum ('income', 'expense');
create type public.financial_status as enum ('pending', 'paid', 'canceled', 'overdue');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.barbershops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 3 and 63),
  custom_domain text,
  logo_url text,
  status public.barbershop_status not null default 'trial',
  plan text not null default 'starter',
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint barbershops_slug_key unique (slug),
  constraint barbershops_custom_domain_key unique (custom_domain)
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_auth_user_id_key unique (auth_user_id)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  role public.membership_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memberships_profile_barbershop_key unique (profile_id, barbershop_id),
  constraint memberships_id_barbershop_key unique (id, barbershop_id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  description text,
  price numeric(12,2) not null check (price >= 0),
  duration_minutes integer not null check (duration_minutes between 5 and 720),
  return_days integer check (return_days between 0 and 3650),
  commission_rate numeric(5,2) not null default 0 check (commission_rate between 0 and 100),
  image_url text,
  active boolean not null default true,
  public_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_name_tenant_key unique (barbershop_id, name),
  constraint services_id_barbershop_key unique (id, barbershop_id)
);

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null check (char_length(name) between 2 and 100),
  phone text,
  bio text,
  avatar_url text,
  active boolean not null default true,
  public_visible boolean not null default true,
  allow_self_blocks boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professionals_profile_tenant_key unique (profile_id, barbershop_id),
  constraint professionals_id_barbershop_key unique (id, barbershop_id)
);

create table public.professional_services (
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  professional_id uuid not null,
  service_id uuid not null,
  custom_duration_minutes integer check (custom_duration_minutes between 5 and 720),
  custom_price numeric(12,2) check (custom_price >= 0),
  created_at timestamptz not null default now(),
  primary key (professional_id, service_id),
  foreign key (professional_id, barbershop_id)
    references public.professionals(id, barbershop_id) on delete cascade,
  foreign key (service_id, barbershop_id)
    references public.services(id, barbershop_id) on delete cascade
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null check (char_length(name) between 2 and 100),
  phone text not null check (char_length(phone) between 8 and 30),
  phone_normalized text not null check (phone_normalized ~ '^[0-9]{8,15}$'),
  email text,
  birth_date date,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_phone_tenant_key unique (barbershop_id, phone_normalized),
  constraint clients_profile_tenant_key unique (profile_id, barbershop_id),
  constraint clients_id_barbershop_key unique (id, barbershop_id)
);

create table public.professional_availability (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  professional_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  slot_interval_minutes integer not null default 15 check (slot_interval_minutes between 5 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_valid_interval check (ends_at > starts_at),
  constraint availability_unique_rule unique (professional_id, weekday, starts_at, ends_at),
  foreign key (professional_id, barbershop_id)
    references public.professionals(id, barbershop_id) on delete cascade
);

create table public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  professional_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_blocks_valid_interval check (ends_at > starts_at),
  constraint schedule_blocks_id_barbershop_key unique (id, barbershop_id),
  foreign key (professional_id, barbershop_id)
    references public.professionals(id, barbershop_id) on delete cascade
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  client_id uuid not null,
  professional_id uuid not null,
  service_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  notes text,
  source text not null default 'dashboard' check (source in ('dashboard', 'public', 'client')),
  created_by uuid references public.profiles(id) on delete set null,
  canceled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_valid_interval check (ends_at > starts_at),
  constraint appointments_cancellation_consistency check (
    (status = 'canceled' and canceled_at is not null)
    or (status <> 'canceled')
  ),
  constraint appointments_id_barbershop_key unique (id, barbershop_id),
  foreign key (client_id, barbershop_id)
    references public.clients(id, barbershop_id) on delete restrict,
  foreign key (professional_id, barbershop_id)
    references public.professionals(id, barbershop_id) on delete restrict,
  foreign key (service_id, barbershop_id)
    references public.services(id, barbershop_id) on delete restrict,
  exclude using gist (
    barbershop_id with =,
    professional_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed', 'completed'))
);

create table public.tenant_settings (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  primary_color text not null default '#b8893e' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#171717' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  background_color text not null default '#faf8f4' check (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  font_family text not null default 'Geist',
  hero_title text not null default 'Seu estilo, no seu tempo',
  hero_subtitle text not null default 'Escolha o serviço e reserve seu horário.',
  banner_url text,
  whatsapp_number text,
  instagram_url text,
  address text,
  opening_hours jsonb not null default '{}'::jsonb check (jsonb_typeof(opening_hours) = 'object'),
  booking_notice_minutes integer not null default 60 check (booking_notice_minutes between 0 and 10080),
  cancellation_notice_minutes integer not null default 120 check (cancellation_notice_minutes between 0 and 10080),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_settings_barbershop_key unique (barbershop_id),
  constraint tenant_settings_id_barbershop_key unique (id, barbershop_id)
);

create table public.public_site_sections (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  section_key text not null check (section_key ~ '^[a-z0-9_-]+$'),
  title text,
  body text,
  image_url text,
  cta_label text,
  cta_url text,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_site_sections_key_tenant unique (barbershop_id, section_key),
  constraint public_site_sections_id_barbershop_key unique (id, barbershop_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);

-- Estrutura pós-MVP: criada agora para evitar remodelagem destrutiva.
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  document text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suppliers_id_barbershop_key unique (id, barbershop_id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null,
  description text,
  sku text,
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  sale_price numeric(12,2) not null default 0 check (sale_price >= 0),
  minimum_stock numeric(12,3) not null default 0 check (minimum_stock >= 0),
  image_url text,
  active boolean not null default true,
  public_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_sku_tenant_key unique (barbershop_id, sku),
  constraint products_id_barbershop_key unique (id, barbershop_id)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  product_id uuid not null,
  type public.inventory_movement_type not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_cost numeric(12,2) check (unit_cost >= 0),
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (product_id, barbershop_id)
    references public.products(id, barbershop_id) on delete restrict
);

create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  type public.financial_transaction_type not null,
  status public.financial_status not null default 'pending',
  category text not null,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  due_at date,
  paid_at timestamptz,
  appointment_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_transactions_id_barbershop_key unique (id, barbershop_id),
  foreign key (appointment_id, barbershop_id)
    references public.appointments(id, barbershop_id) on delete set null (appointment_id)
);

create table public.accounts_payable (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  supplier_id uuid,
  transaction_id uuid,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  due_date date not null,
  status public.financial_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (supplier_id, barbershop_id)
    references public.suppliers(id, barbershop_id) on delete set null (supplier_id),
  foreign key (transaction_id, barbershop_id)
    references public.financial_transactions(id, barbershop_id) on delete set null (transaction_id)
);

create table public.accounts_receivable (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  client_id uuid,
  transaction_id uuid,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  due_date date not null,
  status public.financial_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, barbershop_id)
    references public.clients(id, barbershop_id) on delete set null (client_id),
  foreign key (transaction_id, barbershop_id)
    references public.financial_transactions(id, barbershop_id) on delete set null (transaction_id)
);

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  professional_id uuid not null,
  appointment_id uuid not null,
  amount numeric(12,2) not null check (amount >= 0),
  status public.financial_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commissions_appointment_professional_key unique (appointment_id, professional_id),
  foreign key (professional_id, barbershop_id)
    references public.professionals(id, barbershop_id) on delete restrict,
  foreign key (appointment_id, barbershop_id)
    references public.appointments(id, barbershop_id) on delete restrict
);

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  monthly_price numeric(12,2) not null check (monthly_price >= 0),
  features jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  status public.subscription_status not null default 'trialing',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_subscriptions_barbershop_key unique (barbershop_id)
);

create index memberships_barbershop_status_idx on public.memberships (barbershop_id, status, role);
create index memberships_profile_status_idx on public.memberships (profile_id, status);
create index services_barbershop_active_idx on public.services (barbershop_id, active);
create index professionals_barbershop_active_idx on public.professionals (barbershop_id, active);
create index clients_barbershop_name_idx on public.clients (barbershop_id, name);
create index appointments_tenant_start_idx on public.appointments (barbershop_id, starts_at);
create index appointments_professional_start_idx on public.appointments (professional_id, starts_at);
create index appointments_client_start_idx on public.appointments (client_id, starts_at desc);
create index appointments_status_start_idx on public.appointments (barbershop_id, status, starts_at);
create index availability_professional_weekday_idx on public.professional_availability (professional_id, weekday, active);
create index schedule_blocks_professional_start_idx on public.schedule_blocks (professional_id, starts_at);
create index audit_logs_tenant_created_idx on public.audit_logs (barbershop_id, created_at desc);
create index inventory_movements_product_created_idx on public.inventory_movements (product_id, created_at desc);
create index financial_transactions_tenant_status_idx on public.financial_transactions (barbershop_id, status, due_at);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'barbershops', 'profiles', 'memberships', 'services', 'professionals',
    'clients', 'professional_availability', 'schedule_blocks', 'appointments',
    'tenant_settings', 'public_site_sections', 'suppliers', 'products',
    'financial_transactions', 'accounts_payable', 'accounts_receivable',
    'commissions', 'subscription_plans', 'tenant_subscriptions'
  ]
  loop
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (auth_user_id, name, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(coalesce(new.email, 'Usuário'), '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

commit;
