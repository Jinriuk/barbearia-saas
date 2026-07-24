# Entrega da Fase 1 — Fundação visual, navegação e ativação

> Data: 2026-07-24 · Branch `claude/system-analysis-planning-vbypfc`

## Resultado

- **Design system dark-first** no painel com os tokens do guia visual
  (#0B0F14, #0E141B, #141B24, #1B2531, #2C3948, #5B6B7D, #F4F7FA, dourado
  #F2B84B, info/sucesso/alerta/erro) mapeados nos tokens semânticos do
  shadcn (`--background`, `--card`, `--primary`, `--success`…), fonte
  Inter, e gráficos com a paleta da marca. O tema é aplicado via classe
  `dark` no `<html>` apenas dentro do painel (script inline evita flash;
  portais do Radix herdam) — a página pública do cliente e a landing
  continuam claras, como o plano exige.
- **Navegação agrupada** (desktop): Início/Agenda/Clientes soltos +
  grupos Financeiro (Resumo e caixa, Despesas, A receber, Comissões,
  Relatórios), Serviços e produtos, Equipe (Profissionais, Horários e
  folgas, Permissões) e Configurações. "Identidade Visual" virou
  "Configurações". Cabeçalho com "Ver página de agendamento".
- **Mobile**: barra inferior com Início, Agenda, Clientes, Financeiro e
  botão Menu (sheet com as demais áreas agrupadas). A duplicação
  barra + faixa horizontal de chips foi removida. Filtragem por papel
  preservada (itens sem permissão somem; a barra não "puxa" outros).
- **Expediente, folgas e bloqueios** (`/equipe/horarios`): editor semanal
  por profissional com turnos divididos, dia fechado e intervalo por
  janela; salva via RPC transacional `set_professional_availability`
  (valida janela invertida, sobreposição e intervalo; turnos cruzando a
  meia-noite não são permitidos — decisão documentada). Alterar expediente
  **não cancela** horários: a RPC devolve quantos agendamentos futuros
  ficaram fora das janelas e a tela avisa. Folgas/férias/bloqueios com
  dia(s) inteiro(s) ou período, aviso de conflitos com horários já
  marcados, e remoção. Owner/manager editam todos; profissional edita só a
  própria agenda (RPC + RLS).
- **Regras de agendamento** (Configurações): antecedência mínima,
  cancelamento, horizonte máximo (1–365 dias), **modo de confirmação
  manual/auto** e limite de reservas em aberto por cliente. As RPCs
  públicas obedecem: no modo auto a reserva nasce `confirmed`, a tela
  final mostra "Reserva confirmada!"/status "Confirmada" e o chip da
  página vira "Confirmação imediata" — a promessa sempre corresponde ao
  modo configurado. Horário de funcionamento (texto público) editável.
- **Ativação**: checklist no dashboard derivado de dados reais (endereço/
  WhatsApp, serviço, profissional, expediente, regras+compartilhar), com
  barra de progresso; retoma sozinho e some quando completo.
- Correção: toggle "indisponível" do profissional agora revalida a página
  pública.

## Banco de dados

- Migration `202607240023`: `tenant_settings.booking_horizon_days`,
  `booking_confirmation_mode`, `max_pending_per_client` (com defaults que
  preservam o comportamento anterior — rollback seguro);
  `get_public_barbershop` expõe `bookingConfirmationMode`;
  `get_public_availability`/`create_public_appointment` respeitam
  horizonte/limite/modo; RPC `set_professional_availability` com auditoria
  (`availability.updated`).
- **Pendente**: aplicar 0022+0023 em produção junto com o deploy.

## Testes executados

- `npm run lint` ✅ · `npm run typecheck` ✅ · `npm test` ✅ (47) ·
  `npm run build` ✅ (rota `/equipe/horarios` gerada; fonte Inter baixada
  no build).
- **SQL (Postgres 16 local + shim):** `fase1_agendamento.sql` ✅ — modo
  auto nasce confirmada; horizonte bloqueia (erro e slots); limite de
  pendentes configurado; substituição de expediente com turnos divididos;
  aviso de futuros fora da janela (nada cancelado); janela invertida,
  sobreposição e tenant cruzado rejeitados; dia fechado sem slots;
  bloqueio remove slots. Suites da Fase 0 e vistoria continuam verdes.
- `npm run test:e2e` e validação visual em navegador **não executados**
  (sem stack Supabase local para subir o app) — validar na homologação em
  360/768/1024/1440 px, teclado e contraste. Alvos novos já seguem 44px+
  (inputs h-11, itens de menu min-h-12).

## Riscos e limitações

- O dark-first muda o visual de todas as telas do painel de uma vez;
  componentes antigos com cores hardcoded (emerald/rose/amber em badges)
  continuam legíveis, mas a substituição completa por tokens semânticos
  fica para a Fase 4 (consolidação dos mockups).
- `create_manual_appointment` (balcão) segue sem validar expediente — só
  bloqueios. Decisão mantida e documentada: o balcão pode encaixar fora do
  expediente; Fase 2 revisita com a máquina de estados.
- Onboarding pós-cadastro existente não foi refeito; a jornada de ativação
  cobre o "publicar em 20 minutos" via checklist orientado no dashboard.

## Rollback

- Migration 0023: colunas têm defaults idênticos ao comportamento antigo;
  para reverter comportamento basta recriar as RPCs da 0022. UI: reverter
  o commit `f52d0fa`.

## Próxima fase

- Fase 2 (agenda operacional completa): sem bloqueios. Máquina de estados
  no banco, remarcação, "primeiro disponível" e token público de
  cancelamento dependem só de implementação.
