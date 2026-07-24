# Entrega da Fase 2 — Agenda e jornada operacional completa

> Data: 2026-07-24 · Branch `claude/system-analysis-planning-vbypfc`

## Resultado

- **Máquina de estados no banco** (não só na interface): trigger
  `enforce_appointment_transition` valida pending→confirmed→completed /
  canceled / no_show; correções explícitas completed→confirmed e
  no_show→confirmed (desfazer engano do balcão, com botões "Desfazer" na
  agenda); `canceled` é final; **conclusão no futuro é bloqueada** (e o
  botão "Concluir" some de horários futuros). `in_progress` não foi
  implementado — decisão registrada na migration e na matriz.
- **Remarcação** pela equipe: sheet com a MESMA fonte de disponibilidade da
  página pública + RPC transacional `reschedule_appointment` — preserva a
  linha e o histórico (audit_log com horários anteriores); em conflito a
  exclusion constraint arbitra e o horário anterior fica de pé, com
  mensagem clara.
- **"Primeiro disponível"** sem N chamadas no navegador: RPC
  `get_first_available` avalia todos os profissionais habilitados no
  serviço e devolve os horários ordenados com o profissional de cada slot.
  No formulário público, chip "⚡ Primeiro disponível" (aparece com 2+
  profissionais); o horário é revalidado na reserva.
- **Autogestão da reserva por token** (`/{slug}/reserva/{token}`): token
  aleatório de 26 caracteres por reserva (não expõe UUID; expira junto com
  o horário). O cliente vê referência, status real, serviço, profissional,
  quando e valor estimado; cancela em dois toques respeitando
  `cancellation_notice_minutes` (que agora é usado de verdade); "remarcar"
  = cancelar + reservar de novo (documentado). Tela final da reserva ganhou
  "Adicionar ao calendário" (Google), link de autogestão e botão de
  WhatsApp.
- **Agenda operacional**: visões Próximos / Dia / Semana (agrupada por
  dia), seletor de data, filtro por status (chips com texto), busca por
  cliente (nome/telefone, sem acento), filtro por profissional preservando
  os demais filtros. Remarcar/desfazer integrados na linha.
- Lembretes: verificado que o cron só marca `reminder_sent_at` após envio
  com sucesso (regra §7.6 já atendida).

## Banco de dados

- Migration `202607240024`: trigger de transição; `appointments.public_token`
  (backfill + índice único + trigger); RPCs `reschedule_appointment`,
  `get_first_available`, `get_public_appointment`,
  `cancel_public_appointment`; `create_public_appointment` devolve também o
  token. Grants mínimos (anon só nas RPCs públicas).
- **Pendente**: aplicar 0022+0023+0024 em produção junto do deploy.

## Testes executados

- `npm run lint` ✅ · `npm run typecheck` ✅ · `npm test` ✅ (47) ·
  `npm run build` ✅ (rotas novas `/[tenant]/reserva/[token]` e
  `/api/public/[tenant]/first-available`).
- **SQL (Postgres 16 local + shim):** `fase2_agenda.sql` ✅ 14 asserções —
  transições inválidas bloqueadas, conclusão futura bloqueada, correção
  explícita, remarcação com auditoria, conflito preserva horário anterior,
  primeiro disponível avalia todos/ordenado/sem slot ocupado, consulta e
  cancelamento por token, token inválido rejeitado, antecedência
  respeitada. Suites anteriores re-executadas: vistoria 5✅,
  fase0 10✅, fase1 11✅ — 0 falhas.
- E2E/visual em navegador: não executável neste ambiente (sem stack
  Supabase) — validar na homologação.

## Riscos e limitações

- A correção `completed→confirmed` não mexe na transação financeira
  (fica pendente/paga como estava) — o operador ajusta em Financeiro →
  A receber se preciso; comportamento documentado.
- Remarcação pela equipe não exige janela de expediente (mesma regra do
  lançamento manual: o balcão pode encaixar); bloqueios e conflitos são
  sempre respeitados.
- A visão Semana é uma lista agrupada por dia (não uma grade por colunas);
  atende 360px sem scroll horizontal. Grade visual fica para a Fase 4 se os
  mockups exigirem.

## Rollback

- Reverter o commit da fase; migration 0024 pode ser neutralizada dropando
  os triggers/RPCs novos (colunas token podem ficar sem uso). Nenhum dado é
  destruído.

## Próxima fase

- Fase 2B (cobrança do SaaS) pode iniciar; nenhuma dependência técnica
  pendente além da aplicação das migrations em produção junto ao deploy.
