-- Otimizações de performance (advisor): RLS initplan em profiles + índices
-- de cobertura nas foreign keys. Nenhuma mudança de comportamento.

-- 1) RLS initplan: (select auth.uid()) evita reavaliar a função por linha.
drop policy if exists "users can view their profile" on public.profiles;
create policy "users can view their profile"
on public.profiles for select to authenticated
using (auth_user_id = (select auth.uid()));

drop policy if exists "users can update their profile" on public.profiles;
create policy "users can update their profile"
on public.profiles for update to authenticated
using (auth_user_id = (select auth.uid()))
with check (auth_user_id = (select auth.uid()));

-- 2) Índices de cobertura para foreign keys.
create index if not exists ap_barbershop_idx on public.accounts_payable (barbershop_id);
create index if not exists ap_supplier_idx on public.accounts_payable (supplier_id, barbershop_id);
create index if not exists ap_transaction_idx on public.accounts_payable (transaction_id, barbershop_id);

create index if not exists ar_barbershop_idx on public.accounts_receivable (barbershop_id);
create index if not exists ar_client_idx on public.accounts_receivable (client_id, barbershop_id);
create index if not exists ar_transaction_idx on public.accounts_receivable (transaction_id, barbershop_id);

create index if not exists apr_appointment_idx on public.appointment_products (appointment_id, barbershop_id);
create index if not exists apr_barbershop_idx on public.appointment_products (barbershop_id);
create index if not exists apr_confirmed_by_idx on public.appointment_products (confirmed_by);
create index if not exists apr_product_idx on public.appointment_products (product_id, barbershop_id);
create index if not exists apr_status_idx on public.appointment_products (barbershop_id, status);

create index if not exists appt_client_fk_idx on public.appointments (client_id, barbershop_id);
create index if not exists appt_created_by_idx on public.appointments (created_by);
create index if not exists appt_professional_fk_idx on public.appointments (professional_id, barbershop_id);
create index if not exists appt_service_fk_idx on public.appointments (service_id, barbershop_id);

create index if not exists audit_actor_idx on public.audit_logs (actor_profile_id);

create index if not exists comm_appointment_idx on public.commissions (appointment_id, barbershop_id);
create index if not exists comm_barbershop_idx on public.commissions (barbershop_id);
create index if not exists comm_professional_idx on public.commissions (professional_id, barbershop_id);

create index if not exists eps_barbershop_idx on public.employee_pay_settings (barbershop_id);
create index if not exists emp_created_by_idx on public.employee_payments (created_by);

create index if not exists ft_appointment_idx on public.financial_transactions (appointment_id, barbershop_id);
create index if not exists ft_created_by_idx on public.financial_transactions (created_by);

create index if not exists im_barbershop_idx on public.inventory_movements (barbershop_id);
create index if not exists im_created_by_idx on public.inventory_movements (created_by);
create index if not exists im_product_fk_idx on public.inventory_movements (product_id, barbershop_id);

create index if not exists pav_barbershop_idx on public.professional_availability (barbershop_id);
create index if not exists pav_professional_fk_idx on public.professional_availability (professional_id, barbershop_id);

create index if not exists ps_barbershop_idx on public.professional_services (barbershop_id);
create index if not exists ps_professional_fk_idx on public.professional_services (professional_id, barbershop_id);
create index if not exists ps_service_fk_idx on public.professional_services (service_id, barbershop_id);

create index if not exists sb_barbershop_idx on public.schedule_blocks (barbershop_id);
create index if not exists sb_created_by_idx on public.schedule_blocks (created_by);
create index if not exists sb_professional_fk_idx on public.schedule_blocks (professional_id, barbershop_id);

create index if not exists sup_barbershop_idx on public.suppliers (barbershop_id);
create index if not exists ts_plan_idx on public.tenant_subscriptions (plan_id);
