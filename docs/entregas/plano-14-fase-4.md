# Entrega — Fase 4 do plano de fases (docs/14): Público e mobile

> Data: 2026-07-28 · Branch `claude/analise-plano-fases-htpaiq`
> Escopo: itens 4.1 a 4.9 de [docs/14-plano-de-fases.md](../14-plano-de-fases.md),
> lastreados na [auditoria de julho](../13-auditoria-julho-2026.md) (§7.10, §7.11, pilar G1).

## Resultado por item do plano

**4.1 — Fluxo em 7 etapas.** O agendamento tinha no máximo 5 seções empilhadas
numa página rolável, reveladas conforme o preenchimento. Agora são as 7 etapas
do guia, na ordem dele: serviço, profissional, dia e horário, **seus dados**,
extras, **pagamento**, **confira e confirme** — "Seus dados" subiu para a etapa
4 e os produtos desceram para a 5, como o §7.11 manda. No celular é uma decisão
por tela, com "Continuar" fixo embaixo e o resumo recolhido em **"Ver resumo"**;
no computador, trilha numerada no topo (com volta para etapas já concluídas) e
**resumo fixo na coluna da direita**. A etapa de extras traz o botão **"Pular
esta etapa"**, que não existia. Quando o tenant não tem produto para oferecer,
o fluxo cai para 6 etapas e a numeração continua contínua.

**4.2 — Reconhecer cliente recorrente.** O WhatsApp virou o **primeiro campo**
da etapa de dados e, assim que fica completo, o formulário pergunta ao servidor
quem é: "Que bom te ver de novo, João!" e o nome já preenchido. A consulta é
uma RPC nova (`get_public_client_hint`) que devolve **só o primeiro nome** —
sem e-mail, sem histórico, sem identificador —, exige o número nacional
completo (10+ dígitos) e passa por limite compartilhado por IP, para não virar
um "esse telefone é cliente daqui?". O campo ganhou máscara.

**4.3 — Remarcar sem falar com ninguém.** Antes, "remarcar" era um link
rotulado *"Remarcar: cancele e reserve um novo horário"* — e ele aparecia
inclusive depois de a página avisar que o prazo de cancelamento havia passado.
Agora existe `reschedule_public_appointment`: o cliente escolhe o novo horário
na própria página do token e a reserva se move, com serviço e profissional
preservados. Todas as regras são reconferidas no banco (antecedência, horizonte,
expediente, bloqueios, conflito). Remarcar respeita o **mesmo prazo do
cancelamento** — quando ele passa, a página não oferece nenhum dos dois e diz
por quê.

**4.4 — Confirmar o que foi gravado.** `create_public_appointment` passou a
devolver a reserva como ela ficou no banco (serviço, profissional, horário,
produtos materializados, pagamento e total). A tela final lê **só** desse
retorno; antes ela era montada com o estado do navegador e podia exibir um
pedido que o banco tinha recusado em parte. Os títulos agora são os do §8.1 —
**"Horário confirmado"** / **"Pedido de horário enviado"** — com a frase falada
("Terça-feira, 15h, com João"), "Status" virou **"Situação"**, e as ações
(calendário, WhatsApp, remarcar/cancelar) são botões de verdade, não um texto
de 12px com 60% de opacidade.

**4.5 — Coerência da promessa.** A chamada final da página pública prometia
"reserve agora e chegue na hora certa" em texto fixo. Agora ela depende do modo
real de confirmação: no modo manual, "a barbearia confirma e te avisa pelo
WhatsApp".

**4.6 — Estoque na vitrine.** `get_public_barbershop` passou a expor o saldo de
cada produto (ledger de movimentações **menos** reservas pendentes). Produto sem
saldo aparece como **"Indisponível"** na página e no passo de upsell, o botão
"+" para no limite do estoque e `create_public_appointment` **recusa**
(`PRODUCT_UNAVAILABLE`) — antes dava para reservar produto esgotado, porque a
RPC só checava `active` e `public_visible`. Os produtos do upsell ganharam
**foto**: a etapa vendia produto sem mostrar produto.

**4.7 — Capa curta.** A capa tinha `min-h-[88svh]`, dois orbs animados,
ken-burns, dois chips flutuantes, seta de rolagem — e não mostrava o nome do
negócio. Virou o que o §7.10 pede: foto de fundo com **camada escura de 65%**,
nome do negócio, título curto (com `line-clamp`), benefício e um botão. No
celular também acabou a competição de três botões sólidos na mesma tela: o do
topo some abaixo de `sm` e a barra do polegar só aparece **depois** que a capa
sai da tela.

**4.8 — Horário de funcionamento.** O dado vinha do banco desde a Fase 1 e
nenhum componente o renderizava. Agora existe a **seção 5 obrigatória**
(endereço, horário e contato) entre Produtos e a chamada final. A faixa de
ambiente, que era uma sétima seção fora da ordem do guia, virou a foto dessa
seção — a ordem do §7.10 fecha certa e a página encurtou.

**4.9 — Subrotas mortas.** `/[tenant]/servicos`, `/profissionais` e `/produtos`
eram arquivos de 8 linhas que redirecionavam para âncoras da home. Viraram
páginas de verdade. Isso conserta de quebra um beco: o "Ver todos" dos produtos
devolvia o visitante para os mesmos 6 itens da home — quem tinha 7 produtos
nunca via o sétimo. Agora o link só aparece quando existe mais do que já está
na tela, e leva ao catálogo completo.

## Também corrigido (mesmos §7.10/§7.11 da auditoria)

- **"Escolher este serviço"** visível em cada linha de serviço (o guia exige
  ícone importante sempre com rótulo; antes havia só uma seta num círculo).
- **"Agendar com {nome}"** deixou de ser `opacity-0` até o hover — ou seja,
  invisível em qualquer aparelho de toque — e agora leva `?profissional={id}`,
  com o profissional já selecionado no fluxo.
- **Arquivo .ics** de verdade (`/api/public/[tenant]/reserva/[token]/ics`), para
  iPhone e Outlook; o link do Google Calendar sozinho não resolvia.
- **Bug do estado duplo** no passo 2: escolher horário em "Primeiro disponível"
  preenchia o profissional sem desligar o modo, deixando dois chips com
  `aria-pressed="true"` ao mesmo tempo.
- **Página do token** com a mesma completude da tela final: produtos, pagamento,
  total, calendário e "Situação" no lugar de "Status".
- Alvos de toque de 44px nos controles novos (quantidade, voltar, chips).

## Banco de dados

Migration `202607280030_fase4_publico_agendamento.sql`:

| Objeto | O que muda |
|---|---|
| `product_available_stock(uuid, uuid)` | novo: saldo público = ledger − reservas pendentes (interna) |
| `appointments.payment_preference` | nova coluna (`public.payment_method`, nullable) |
| `get_public_barbershop` | produtos passam a trazer `stock` |
| `get_public_client_hint(text, text)` | novo: primeiro nome do cliente pelo telefone |
| `create_public_appointment` | +`p_payment_preference`, trava de estoque, retorno completo |
| `get_public_appointment` | +pagamento, produtos, total, `canReschedule`, ids |
| `reschedule_public_appointment(text, timestamptz)` | novo: remarcação pelo cliente |

**Aplicada em produção (projeto `jaerticlcbsuvgmiumfl`) em 2026-07-28**, antes
do deploy do código, como docs/09 e docs/12 exigem — `create_public_appointment`
mudou de assinatura e o código novo chama a versão com pagamento. Conferido
depois de aplicar: só uma sobrecarga da RPC (a antiga foi derrubada), grants de
`anon` nos três pontos públicos, `stock` chegando na vitrine (`studio-aurora`
com saldo real, `aurora` com `null` por não usar o módulo de estoque) e
`get_public_client_hint` devolvendo o primeiro nome só para o telefone certo no
tenant certo — número parcial, número desconhecido e slug de outro tenant
devolvem `null`.

`product_available_stock` fica **sem grant** para `anon`/`authenticated`: as duas
funções que a usam são `SECURITY DEFINER` e executam como o dono, então a chamada
interna vale do mesmo jeito. Não há uso público direto — expor
`/rest/v1/rpc/product_available_stock` seria superfície à toa.

### Decisões registradas

1. **`stock` nulo = produto sem controle de estoque.** Saldo 0 para quem nunca
   registrou movimentação marcaria a vitrine inteira como "Indisponível" —
   regressão séria para quem não usa o módulo de estoque. Por isso a função
   devolve `null` quando o produto não tem nenhuma movimentação, e a trava só
   vale para produto efetivamente controlado.
2. **`payment_preference`, não `payment_method`.** Não existe gateway (é Fase
   5), então a etapa 6 pergunta como o cliente **pretende pagar no local**. O
   pagamento recebido continua vivendo em `financial_transactions`, gravado na
   conclusão do atendimento. Nomes diferentes para não confundir intenção com
   caixa. Forma inválida nunca derruba a reserva: vira "decide na hora".
   A etapa **fica no ar mesmo sem gateway**: o §7.11 prevê exatamente esse caso
   ("pagar no local ou forma disponível"), ela já nasce com "Decido na hora"
   selecionado — então custa um toque em "Continuar" para quem não se importa —
   e mostra o valor à vista, para o cliente não precisar abrir o resumo só para
   conferir quanto vai pagar. Quando o gateway chegar na Fase 5, é esta etapa
   que ganha a cobrança, sem mexer no resto do fluxo.
3. **Remarcar não troca de profissional.** Trocar de profissional é uma reserva
   nova — remarcação preserva serviço e profissional e move só o horário.
4. **Reconhecimento por telefone tem superfície mínima.** Primeiro nome apenas,
   POST (o número não vai para log de acesso nem Referer), nacional completo
   obrigatório e limite por IP. É o mínimo para a conveniência funcionar sem
   virar consulta de base.
5. **Navegação por etapas sem `history.pushState`.** O botão físico "voltar" do
   Android não navega entre etapas: o App Router intercepta `popstate` e o risco
   de conflito não compensa. Cada etapa tem "Voltar" visível (seta no celular,
   botão no computador) e a trilha do desktop volta para etapas concluídas.

## Testes executados

```
npm run typecheck   ✓ sem erros
npm run lint        ✓ sem erros e sem avisos
npm test            ✓ 79 testes (11 arquivos) — eram 54
npm run build       ✓ build de produção completo
npx playwright test ✓ 7 passaram, 4 pularam (Supabase inalcançável do sandbox)
```

25 testes novos cobrindo a regra pura da fase: ordem e contagem das 7 etapas,
títulos exigidos da tela final, frase falada, rótulos de pagamento, geração do
`.ics` (CRLF, escape RFC 5545, `TENTATIVE` para reserva pendente, dobra de
linha em 75 octetos), máscara de telefone, horário de funcionamento e as três
formas de saldo de estoque (nulo, controlado, ausente).

## Não entra nesta fase

- **Grade da agenda, perfil do cliente, nova venda** — Fase 2.
- **Financeiro, comissões, configurações** — Fase 3.
- **Gateway de pagamento, plano anual, landing** — Fase 5. Enquanto não existir
  gateway, a etapa 6 continua sendo declaração de intenção, não cobrança.
- **Notificar o cliente quando a barbearia confirmar** (o outro lado do pilar
  G1): depende da régua de mensagens da Fase 5. Hoje a remarcação e o
  cancelamento já fecham sozinhos; a confirmação ainda chega pelo WhatsApp
  manual do dono.
