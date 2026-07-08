-- Categoria opcional do serviço (etapa 6): editável no painel, ajuda a
-- organizar o catálogo. Nada muda no fluxo existente quando fica nula.
alter table public.services
  add column if not exists category text
    check (category is null or char_length(category) <= 60);
