# Entrega da Fase 3 — Inteligência de clientes e retorno

> Data: 2026-07-24 · Branch `claude/system-analysis-planning-vbypfc`

## Resultado

- **Página de clientes virou centro de retorno**: cada cliente mostra
  última visita concluída (e dias sem visitar), nº de atendimentos,
  frequência mediana ("a cada ~Nd"), gasto total e médio (só transações
  pagas), serviço e profissional habituais, retorno previsto com badge
  textual (Em atraso / Volta em breve / Em dia / Sem previsão) e indicador
  de confiança ("poucas visitas" com 1–2 visitas — nunca classifica como
  perdido sem histórico).
- **Cálculo de retorno com hierarquia documentada** (§9.2): mediana dos
  intervalos das visitas concluídas (≥3 visitas, limitada a 5–180 dias) →
  `services.return_days` do último serviço → fallback 30 dias.
  Cancelamento e falta nunca contam como visita. Campo "Retorno
  recomendado (dias)" adicionado ao formulário de serviço.
- **Segmentos com limites documentados**: Todos, Para chamar (atrasado +
  sem contato há 14 dias + sem opt-out), Próximos do retorno (7 dias), Em
  atraso, Sem voltar há 60 dias, Arquivados. Assinantes/Inadimplentes
  entram na Fase 4 junto com os planos de clientes.
- **Ação por WhatsApp**: botão "Chamar" abre o wa.me com mensagem editável
  (nome, último serviço, profissional habitual) e registra o contato em
  `client_contacts` (nunca o conteúdo da conversa). Resultado marcado
  depois (sem resposta / respondeu / agendou / não quer contato — este
  liga o opt-out e interrompe a régua). Opt-out manual por cliente.
- **Dashboard orientado a ação** (§9.5): card "Precisa de atenção hoje"
  com Clientes para chamar, Reservas aguardando confirmação e Contas
  vencidas — cada item com destino direto; só aparece quando há o que
  fazer.
- **Performance** (§9.6): a página deixou de carregar a base inteira no
  navegador — busca (nome/telefone), segmentos e paginação (25/página)
  rodam no Postgres via RPC `get_client_insights` (agregados por window
  function + laterais só para a página exibida).

## Banco de dados

- Migration `202607240026`: `clients.contact_opt_out`; tabela
  `client_contacts` (RLS owner/manager/recepção); RPC `get_client_insights`
  (definer com checagem de papel — manager/recepção veem agregados sem
  depender da RLS restrita do financeiro; tenant cruzado bloqueado) e
  `count_clients_to_call`.

## Testes executados

- `npm run lint` ✅ · `npm run typecheck` ✅ · `npm test` ✅ (54) ·
  `npm run build` ✅.
- **SQL:** `fase3_clientes.sql` ✅ — última visita ignora cancelamento e
  falta; mediana correta (20d) com confiança alta; gasto soma apenas
  transações pagas; fallback `return_days` (21d) com confiança baixa;
  sem histórico = sem previsão; segmento "para chamar" exclui opt-out
  (que permanece em "atrasados") e aplica carência de 14 dias após
  contato; paginação com total; tenant cruzado bloqueado (NOT_AUTHORIZED).

## Riscos e limitações

- "Gasto total" considera transações pagas ligadas a atendimentos do
  cliente (fonte de verdade financeira); receitas avulsas sem
  `appointment_id` não entram no gasto por cliente (documentado).
- Perfil completo do cliente (histórico navegável de agendamentos e
  pagamentos em página própria) fica para a Fase 4; os agregados já
  respondem "quem chamar e por quê".
- Medição contato → agendou depende do registro manual do resultado pela
  equipe (sem automação de resposta do WhatsApp — fora de escopo até haver
  API oficial por tenant).

## Rollback

- Reverter o commit; migration 0026 apenas adiciona coluna/tabela/RPCs —
  neutralizável revogando os grants, sem perda de dados.

## Próxima fase

- Fase 4 (gestão completa: financeiro com abas, comissões com fonte única,
  planos de clientes) — sem bloqueios técnicos.
