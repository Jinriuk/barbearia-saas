-- Comissão padrão por profissional (regra de pagamento) — etapa 3.1.
alter table public.employee_pay_settings
  add column if not exists commission_rate numeric not null default 0
    check (commission_rate >= 0 and commission_rate <= 100);

-- Secretária (receptionist) pode alterar a disponibilidade do profissional
-- (etapa 3.3). É staff de confiança; a UI só troca public_visible.
drop policy if exists "receptionist can update professionals" on public.professionals;
create policy "receptionist can update professionals"
on public.professionals for update to authenticated
using (
  public.has_barbershop_role(
    barbershop_id, array['receptionist']::public.membership_role[]
  )
)
with check (
  public.has_barbershop_role(
    barbershop_id, array['receptionist']::public.membership_role[]
  )
);
