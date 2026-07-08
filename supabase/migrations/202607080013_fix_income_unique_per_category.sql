-- Correção crítica encontrada no QA de produção: o índice único original
-- (financial_transactions_income_appointment_key) permitia UMA receita
-- income por agendamento. No modelo desacoplado (Fase 10), a receita do
-- serviço entra na conclusão e a de cada produto na confirmação da venda —
-- todas ligadas ao mesmo appointment_id — e a segunda inserção estourava
-- "duplicate key", fazendo a confirmação de venda falhar com
-- "Não foi possível confirmar a venda.".
--
-- A unicidade agora protege apenas a receita do serviço; produtos são
-- protegidos pelo status da reserva (confirm_product_sale retorna cedo se a
-- reserva já estiver confirmada).
drop index if exists public.financial_transactions_income_appointment_key;

create unique index financial_transactions_service_income_key
  on public.financial_transactions (appointment_id)
  where appointment_id is not null
    and type = 'income'
    and category = 'service';
