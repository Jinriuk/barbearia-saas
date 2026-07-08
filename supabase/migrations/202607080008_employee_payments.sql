-- Pagamento de funcionários (etapa 10.5). Acesso exclusivo do dono via RLS.

create table if not exists public.employee_pay_settings (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  professional_id uuid not null references public.professionals(id) on delete cascade,
  model text not null default 'commission'
    check (model in ('commission', 'fixed', 'hybrid')),
  base_salary numeric not null default 0 check (base_salary >= 0),
  payment_period text not null default 'monthly'
    check (payment_period in ('weekly', 'biweekly', 'monthly')),
  payment_day integer check (payment_day between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (professional_id)
);

create table if not exists public.employee_payments (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  professional_id uuid not null references public.professionals(id) on delete cascade,
  amount numeric not null check (amount >= 0),
  reference text,
  notes text,
  paid_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists employee_payments_tenant_paid_idx
  on public.employee_payments (barbershop_id, paid_at desc);
create index if not exists employee_payments_professional_idx
  on public.employee_payments (professional_id, paid_at desc);

alter table public.employee_pay_settings enable row level security;
alter table public.employee_payments enable row level security;

create policy employee_pay_settings_owner_all on public.employee_pay_settings
  for all to authenticated
  using (public.has_barbershop_role(barbershop_id, array['owner']::public.membership_role[]))
  with check (public.has_barbershop_role(barbershop_id, array['owner']::public.membership_role[]));

create policy employee_payments_owner_all on public.employee_payments
  for all to authenticated
  using (public.has_barbershop_role(barbershop_id, array['owner']::public.membership_role[]))
  with check (public.has_barbershop_role(barbershop_id, array['owner']::public.membership_role[]));

create trigger set_employee_pay_settings_updated_at
  before update on public.employee_pay_settings
  for each row execute function public.set_updated_at();
