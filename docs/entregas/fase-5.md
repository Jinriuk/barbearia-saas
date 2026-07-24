# Entrega da Fase 5 — Página de vendas e leads (parcial honesta)

> Data: 2026-07-24 · Branch `claude/system-analysis-planning-vbypfc`

## Resultado

- **Copy recomendada aplicada** ao hero da landing de barbearias:
  "Gestão simples para barbearias que querem crescer." + subtexto "Da
  agenda ao lucro… saiba quais clientes precisam voltar e tome decisões
  com clareza." A landing já não continha jargão técnico (RLS/constraints)
  no corpo — verificado.
- **Captura de lead** nas duas landings (barber e salão): etapa curta —
  nome, WhatsApp **ou** e-mail, consentimento obrigatório e plano de
  interesse opcional; UTMs da URL e página de origem vão junto; grava via
  `POST /api/public/leads` (rate limit compartilhado, Fase 2B). Lead não
  cria conta.
- **Evento de funil**: `lead_submitted` via Vercel Analytics, sem PII
  (só a vertical como propriedade).
- Preços da landing = preços do catálogo do banco (Fase 2B) — landing
  nunca contradiz o checkout.

## Fora desta entrega (documentado)

- **Régua de abandono** (e-mails/WhatsApp em 24/48–72h): `planejado` —
  exige infraestrutura de e-mail transacional e opt-in de WhatsApp; a
  interrupção por compra/descadastro será construída junto.
- **Prova social**: nenhum depoimento adicionado — o plano proíbe
  depoimento não validado; a demonstração de produto (demo pública)
  cumpre o papel.
- **Reestruturação completa das 13 seções** da landing: a estrutura atual
  já cobre hero/problema/recursos/planos/FAQ/CTA; o redesenho fino segue
  os mockups quando a validação comercial começar.

## Testes

- lint/typecheck/test/build ✅; envio de lead validado contra o schema da
  rota (mesmo contrato da Fase 2B, testado via SQL/RLS).
