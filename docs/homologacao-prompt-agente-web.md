# Prompt — Homologação e auditoria visual do NexoBarber

> Copie tudo abaixo da linha e envie para o agente web. Ele não precisa de
> nenhum contexto extra: o prompt é autocontido.

---

Você é um auditor de qualidade (QA) e vai homologar o NexoBarber, um SaaS
para barbearias e salões, recém-deployado em produção:

- **URL base**: https://barbearia-saas-sigma.vercel.app
- **Demos públicas**: `/aurora` (barbearia, tema escuro) e `/studio-aurora`
  (salão, vertical feminina, tema claro)
- **Landings**: `/` (barbearia) e `/salao` (salão)
- O painel (`/dashboard`, `/agenda`, `/clientes`, `/financeiro`…) exige
  login. Se você não tiver credenciais, faça o cadastro em `/cadastro`
  (cria um trial novo com onboarding) e homologue com essa conta nova —
  isso também valida o fluxo de ativação.

Sua tarefa tem 3 partes: **(A) auditoria visual**, **(B) homologação
funcional** e **(C) relatório**. Não corrija nada — apenas registre. Não
crie dados em contas de terceiros; use apenas a conta que você criou e as
páginas públicas das demos.

## A) Auditoria visual

Teste cada tela nos 4 viewports: **360×800 (mobile), 768×1024 (tablet),
1024×768 e 1440×900 (desktop)**. Para cada tela e viewport, registre
problemas com print.

Telas e o que verificar:

1. **Landing `/` e `/salao`**
   - Hero, seção de preços (deve mostrar mensal E anual com valores reais —
     Padrão R$ 49,90/mês e Plus R$ 99,90/mês, anual = 10 mensalidades),
     formulário "Quero receber contato" (lead) com checkbox de
     consentimento obrigatório.
   - Nada pode prometer funcionalidade que não existe (ex.: não pode haver
     botão de checkout/pagamento online — o texto deve indicar contato/trial).
   - Rodapé com links de Termos e Privacidade funcionando.
2. **Página pública do tenant `/aurora` e `/studio-aurora`**
   - Identidade visual do tenant (cores, fotos, seções), lista de serviços
     com preço e duração, profissionais, produtos (só no plano Plus).
   - `/studio-aurora` deve ter vocabulário feminino/salão (não "barbearia").
   - Scroll horizontal não pode existir em nenhum viewport.
3. **Fluxo público de agendamento (dentro da página do tenant)**
   - Escolher serviço → profissional (ou "primeiro disponível") → dia →
     horário → dados (nome + WhatsApp) → confirmar.
   - A tela final deve mostrar: **código de referência curto** (6
     caracteres, ex.: `A7KM3P`), o **status real** ("Aguardando
     confirmação" no modo manual) e um **link de gerenciamento da reserva**
     (`/{slug}/reserva/{token}`). Não pode aparecer UUID interno nem
     promessa de "confirmação na hora" se o modo for manual.
   - Abra o link de gerenciamento: deve mostrar os dados da reserva e o
     botão de cancelar (respeitando antecedência). Cancele e confirme que o
     status muda para cancelado.
4. **Painel (conta nova de trial)** — telas: `/dashboard`, `/agenda`,
   `/clientes`, `/financeiro`, `/servicos`, `/produtos`, `/equipe`,
   `/equipe/horarios`, `/configuracoes`, `/assinatura`, `/relatorios`.
   - O painel é **dark-first** (fundo escuro, tokens dourado/âmbar). A
     página pública dos tenants continua com o tema do tenant.
   - Mobile (360px): a navegação vira **tab bar inferior** (Início, Agenda,
     Clientes, Financeiro + botão Menu que abre o restante). Nenhuma
     página pode ficar inacessível no mobile.
   - Desktop: sidebar com grupos (Início/Agenda/Clientes, Financeiro,
     Serviços e produtos, Equipe, Configurações).
   - `/dashboard`: checklist de ativação (para conta nova), card "Precisa
     de atenção hoje", card "A receber".
   - `/financeiro`: 6 cards (Vendido, Recebido, A receber, Despesas pagas,
     Lucro, comparação com mês anterior) + seção "A receber" com ações.
   - `/clientes`: segmentos (Todos, Para chamar, Próximos, Atrasados, Sem
     voltar 60d, Arquivados), busca, paginação.
   - `/equipe/horarios`: editor semanal de expediente + folgas/bloqueios.
   - `/configuracoes`: regras de agendamento (antecedência, horizonte,
     modo de confirmação manual/auto, limite de pendentes) e horário de
     funcionamento.
   - `/assinatura`: preços mensal/anual do catálogo, SEM botão de checkout
     (deve indicar que o pagamento online ainda não está disponível).
5. **Acessibilidade e polimento (em todas as telas)**
   - Navegação por teclado: Tab percorre os controles na ordem visual,
     foco sempre visível, Esc fecha sheets/modais.
   - Contraste: textos sobre fundo escuro legíveis (WCAG AA — apontar
     qualquer texto cinza-sobre-cinza suspeito).
   - Estados vazios: telas sem dados devem ter mensagem orientando a ação,
     não tabela vazia ou erro.
   - Toques/cliques: alvos de pelo menos 40px no mobile; textos não podem
     transbordar de cards/botões; datas e moeda em pt-BR (R$, dd/mm).

## B) Homologação funcional (fluxos de ponta a ponta)

Use a conta trial que você criou. Execute na ordem — cada passo depende do
anterior:

1. **Onboarding**: complete o cadastro → o onboarding deve criar a
   barbearia com slug próprio; a página pública `/{seu-slug}` deve abrir.
2. **Catálogo**: crie 1 serviço (preço, duração; verifique os campos
   "retorno recomendado" e "comissão específica") e 1 profissional
   vinculado ao serviço. No formulário do serviço deve existir a "regra de
   público" (Público / Assinantes / Interno) — crie um segundo serviço
   como "Interno" e confirme que ele NÃO aparece na página pública.
3. **Expediente**: em Equipe → Horários, defina o expediente do
   profissional (ex.: seg–sex 9h–18h). Sem expediente, a página pública
   não pode oferecer horário nenhum.
4. **Reserva pública (modo manual)**: pela página pública, faça uma reserva
   como cliente. Confirme: nasce "Aguardando confirmação", gera referência
   e link de gerenciamento.
5. **Confirmação e agenda**: no painel `/agenda`, a reserva aparece como
   pendente → confirme-a. Teste também: remarcar (deve validar conflito) e
   as visões Próximos/Dia/Semana com filtros de status.
6. **Modo automático**: em Configurações, mude o modo de confirmação para
   "auto". Faça nova reserva pública: deve nascer **Confirmado** e a
   página pública deve refletir esse comportamento no texto.
7. **Verdade financeira** (o teste mais importante):
   - Conclua um atendimento confirmado (só funciona se o horário já
     passou — se necessário crie um agendamento manual no passado próximo
     pela agenda, conclua-o).
   - Em `/financeiro`: o valor deve aparecer em **"Vendido"** e em **"A
     receber"** — NÃO em "Recebido".
   - Registre o recebimento (a ação deve EXIGIR forma de pagamento).
   - Agora o valor migra para "Recebido" e sai de "A receber".
   - Teste o estorno: reverter o recebimento devolve o valor para "A
     receber" sem apagar histórico.
8. **Clientes**: em `/clientes`, o cliente da reserva deve existir com
   última visita, gasto e retorno previsto. Teste a ação de contato por
   WhatsApp (deve abrir wa.me com texto editável) e registre um resultado.
9. **Papéis** (se conseguir convidar um segundo usuário): recepcionista
   não pode ver `/financeiro`; profissional vê apenas a própria agenda.
   Se não conseguir testar, registre como "não testado".
10. **Erros honestos**: tente reservar um horário já ocupado (duas abas) —
    deve dar mensagem clara de conflito, não erro genérico. Tente reservar
    fora do expediente manipulando a URL/reenvio — deve ser bloqueado.

## C) Relatório final

Entregue em markdown:

1. **Resumo executivo** — pronto para vender? (sim/não/com ressalvas).
2. **Bugs bloqueantes** — impedem uso real (com passos de reprodução,
   print, viewport e URL).
3. **Problemas visuais** — por tela, com viewport e print.
4. **Melhorias sugeridas** — UX/copy, priorizadas.
5. **Tabela de cobertura** — cada item de A e B com status:
   `passou` / `falhou` / `não testado` (e por quê).

Critérios de severidade: **bloqueante** = perda de dados, fluxo quebrado,
dinheiro errado; **alto** = funciona mas confunde ou visual quebrado em
viewport comum; **médio** = polimento; **baixo** = detalhe.

Não invente resultados: se algo não pôde ser testado (ex.: convite de
segundo usuário, e-mail), marque explicitamente como "não testado".
