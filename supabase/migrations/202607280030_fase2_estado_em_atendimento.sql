-- Fase 2 (plano de fases, item 2.2) — o estado "Em atendimento".
--
-- A Fase 2 anterior registrou a decisão de NÃO implementar `in_progress`
-- (202607240024, cabeçalho): o balcão ia de confirmado direto a concluído.
-- O guia visual §7.2 pede o botão "Iniciar" e a faixa "Em atendimento", e a
-- auditoria de julho listou a ausência como lacuna — a decisão é revertida
-- aqui, do jeito que ela mesma previu ("a coluna pode ganhar o estado
-- depois sem quebrar nada").
--
-- Por que este valor mora sozinho num arquivo: o Postgres aceita
-- `alter type ... add value` dentro de uma transação, mas proíbe USAR o
-- valor novo na mesma transação. A exclusion constraint da agenda e a RPC
-- de disponibilidade precisam citar 'in_progress' no predicado — logo elas
-- vivem na migration seguinte, que roda em outra transação.

alter type public.appointment_status add value if not exists 'in_progress' after 'confirmed';
