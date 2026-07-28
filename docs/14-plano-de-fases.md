# Plano de fases — NexoBarber

Derivado da [auditoria de julho de 2026](13-auditoria-julho-2026.md): 380 requisitos
verificados contra o guia visual do revisor técnico, a apresentação estratégica e os
pedidos diretos do sócio.

**Situação de partida:** 96 requisitos atendidos (25%), 138 parciais (36%), 145 não
atendidos (38%).

A ordem das fases não segue a ordem do guia. Segue risco e retorno: primeiro o que pode
causar prejuízo ou processo, depois o que o barbeiro usa todo dia, depois o que fecha a
venda. O guia sugere começar pela fundação visual (§13); a auditoria encontrou defeitos de
dado e de conformidade que precisam vir antes, porque estão em produção com clientes reais.

---

## Fase 0 — Parar o sangramento ✅ entregue

**Por quê primeiro:** são os itens em que o sistema mostra número errado, promete o que não
cumpre, ou expõe a empresa. Nada disso é "melhoria de layout" — é correção.

> **Entregue em 28/07/2026** — relatório em [`entregas/fase-0-correcoes.md`](entregas/fase-0-correcoes.md),
> banco em `202607280030_fase0_correcoes.sql`, testes em `supabase/tests/fase0b_correcoes.sql`.
> Dois itens não sobreviveram à reverificação na forma escrita abaixo (0.3 e 0.11) — as
> correções aplicadas e o porquê estão no relatório.

### Risco jurídico e comercial (o mais urgente)

| # | Problema | Onde | Ação |
|---|---|---|---|
| 0.1 | Seis depoimentos nominais **fictícios** apresentados como clientes reais | `src/app/page.tsx:113-132`, `src/app/salao/page.tsx` | Remover, ou substituir por depoimentos reais com autorização por escrito. Exposição a publicidade enganosa (CDC art. 37) e ao CONAR |
| 0.2 | "Cancele quando quiser" prometido **5 vezes** sem cancelamento self-service | `page.tsx:262,567`; `salao/page.tsx:254,522`; `assinatura/page.tsx:183` | Implementar o cancelamento na conta ou trocar a frase por "sem fidelidade — cancelamento pelo suporte" |
| 0.3 | ~~Landing vende "Relatório financeiro em PDF" no plano Padrão; o catálogo o entrega só no Plus~~ **direção invertida** | `page.tsx:596` vs `src/lib/billing/index.ts:40` | O código nunca restringiu o PDF ao Plus (`relatorio-financeiro/page.tsx` só checa o papel). Errada estava a lista do catálogo: o PDF foi movido para o Padrão |
| 0.4 | Consentimento de lead sem prova: não grava IP, user-agent nem versão do termo; sem opt-out | `supabase/migrations/202607240025_*.sql:104-118` | Acrescentar as colunas e um caminho de descadastro. Exigência de LGPD antes de qualquer disparo |
| 0.5 | Texto de consentimento diz "NexoBarber" na landing de salão | `src/components/platform/lead-capture-form.tsx:140` | Tornar o texto dependente da vertical |

### Números errados

| # | Problema | Onde | Ação |
|---|---|---|---|
| 0.6 | Saldo de estoque somado sobre **400 movimentações truncadas** — a partir daí o estoque exibido é ficção | `src/app/(dashboard)/produtos/page.tsx:72-77,104-115` | Somar no banco (view ou RPC), nunca no cliente |
| 0.7 | `/relatorios` e vários blocos do Financeiro batem no teto de ~1000 linhas do PostgREST e somam errado, sem avisar | `relatorios/page.tsx:53-59`; `financeiro/page.tsx:140-168`; `comissoes/page.tsx:99` | Agregar no banco. Onde houver corte, dizer na tela que há corte |
| 0.8 | **Estoque negativo é possível** — "saída por perda" de 100 unidades num produto zerado deixa −100 | sem trigger em `inventory_movements` | Trigger `BEFORE INSERT` ou RPC transacional. O guia é categórico (§7.6) |
| 0.9 | Comissão calculada sobre o **preço atual do catálogo** — subir o preço de um serviço reescreve comissões já fechadas | `comissoes/page.tsx:152` | Congelar o valor transacionado no fechamento |
| 0.10 | Fiado lançado em `/contas-a-receber` fica **fora de todos os indicadores** do Financeiro | `src/modules/bills/actions.ts:61-67` | Unificar as duas fontes de recebível |
| 0.11 | O card "A receber" ignora o período selecionado (soma tudo, sempre) | `202607240027_*.sql:45-49` | Rotulado como saldo total, **sem** mudar a coluna: o painel usa o mesmo número e ali o total é o certo. O recorte da janela entrou como `receivable_period` |
| 0.12 | Lista "A receber" capada em 100 e o título anuncia `A receber (100)` como se fosse o total | `financeiro/page.tsx:184,450` | Paginar e mostrar a contagem real |
| 0.13 | Gasto do cliente **assinante aparece como R$ 0,00** — justamente o cliente mais valioso | `202607240026_*.sql:137-147` | Incluir a receita de plano no agregado |
| 0.14 | Comissão é apurada por competência, lucro por caixa: o sistema sugere pagar comissão de dinheiro que ainda não entrou | `comissoes/page.tsx:96` vs `202607240027_*.sql:58` | Escolher um regime e deixar explícito na tela |

### Segurança e permissão

| # | Problema | Onde | Ação |
|---|---|---|---|
| 0.15 | Trocar senha **não exige a senha atual** e não há "sair de outros aparelhos" | `src/modules/account/actions.ts:52-79` | Exigir reautenticação |
| 0.16 | `/clientes` não checa permissão (as outras telas checam) e engole erro da RPC silenciosamente | `clientes/page.tsx:100,123` | Adicionar `can(...)` e tratar o erro |
| 0.17 | Colaborador é criado pelo dono **com senha definida pelo dono** e `email_confirm: true` | `src/modules/professionals/actions.ts:69` | Ver Fase 3 (convite real). Aqui: no mínimo forçar troca no primeiro acesso |

**Entrega:** nenhum número exibido pode estar errado; nenhuma frase de venda pode prometer o
que o produto não faz.

---

## Fase 1 — Fundação visual

**Por quê agora:** todas as fases seguintes tocam componentes. Consertar botão, campo e selo
depois significa refazer as telas duas vezes. É a Etapa 1 do §13 do guia.

**1.1 Tema claro e alternador** — hoje o painel é forçado em escuro (`panel-theme.tsx:15`)
sem opção. O guia exige tema claro opcional, escolhido pelo usuário e lembrado (§1, §7.9,
§11). Inclui reescrever o bloco `:root` com os 13 valores do §3.2 — hoje é o preset neutro do
shadcn, não a paleta do guia.

**1.2 Corrigir o gráfico do painel** — `monthly-revenue-chart.tsx:36-40` decide cor por
`prefers-color-scheme` e por `:root[data-theme]`, mas nada no sistema define `data-theme`.
Num aparelho com tema claro do sistema operacional, o gráfico desenha texto cinza-escuro
sobre o card escuro. Também ignora os tokens `--chart-*` e usa azul/verde arbitrários em vez
da paleta obrigatória do §6.1. O mesmo componente é reusado no PDF de fundo branco.

**1.3 Contraste dos controles** — `--input` aponta para o divisor `#2C3948` em vez da borda de
controle `#5B6B7D`: a borda dos campos fica em **1,47:1**, contra os 3:1 mínimos que o próprio
§12 exige. Uma linha de token conserta todos os formulários.

**1.4 Foco de teclado** — o anel de foco é dourado, igual à cor de marca, então some em cima do
botão principal. O §11 especifica azul.

**1.5 Alturas e alvos de toque** — botões e campos hoje têm 32–36px; o guia pede 44px no
desktop e 48px no celular, com alvo mínimo de 44×44. Os ícones de ação em linha (excluir,
arquivar, ocultar) têm 28×28px — são usados em pé, com o celular na mão, dentro do salão.

**1.6 Painel lateral em tela cheia no celular** — `sheet.tsx:65` usa `w-3/4`; §5.3 e §10 pedem
tela inteira.

**1.7 Camada de aviso e Desfazer** — não existe toast no projeto. Em 6 dos 9 painéis laterais a
mensagem de sucesso é literalmente descartada: o painel fecha e o `Alert` só renderiza quando
`!state.success`. Sem essa camada não há como cumprir o §5.7.

**1.8 Variantes de Alert** — só existem `default` e `destructive`. Faltam sucesso, atenção e
informação, e os 5 fundos tonais do §3.

**1.9 Selos de situação** — as cores estão **invertidas** em relação à tabela do §5.6:
`canceled` está cinza e `no_show` está vermelho; o guia pede o contrário. Há ainda dois
sistemas de cor paralelos (paleta crua do Tailwind em um arquivo, tokens em outro).

**1.10 Máscaras** — nenhuma máscara existe (telefone, moeda, hora, percentual).

**1.11 Tabelas viram cartões** — 7 telas rolam na horizontal no celular. O padrão já existe em
dois blocos do Financeiro (`financeiro/page.tsx:580-602`) e pode virar um `<DataList>`.

**1.12 Tokens no lugar de cor fixa** — 115 classes de paleta fixa no painel contra 17 usos dos
tokens semânticos.

**1.13 Resíduos de linguagem (§8.1)** — a maior parte já foi feita (`PDV`, `No-show`,
`Exportar`, `Performance`, `Recorrente`, `Margem` têm zero ocorrências). Faltam:
"Ticket médio" → "Gasto médio por cliente" (3 lugares); "Status" → "Situação" (6, sendo 2 na
área pública que o cliente leigo lê); "Checkout" → linguagem de balcão; "Assinatura" →
"Meu plano NexoBarber" (hoje a palavra significa duas coisas diferentes no mesmo produto);
"Ver página pública" → "Ver página de agendamento"; "Movimentação de saída" → "Registrar
saída"; "URL da imagem" → "Escolher foto".

**1.14 Navegação (§9)** — o menu tem 15 destinos onde o guia pede 7; 4 dos 7 nomes prescritos
existem só como cabeçalho de grupo inerte. No celular, "Página de agendamento", "Minha conta" e
"Meu plano" não são alcançáveis.

---

## Fase 2 — O que o barbeiro usa todo dia

**Por quê agora:** é onde o produto ganha ou perde o cliente na primeira semana. Também é onde
está a maior lacuna isolada da auditoria.

**2.1 Agenda de verdade (§7.2)** — a maior lacuna do sistema. Hoje "Dia", "Semana" e "Próximos"
renderizam **listas**; não existe grade com horário na lateral e profissionais em colunas.
Consequências em cadeia: não dá para clicar num vazio e abrir o cadastro já preenchido; não dá
para ver horário **livre** (a agenda nunca consulta disponibilidade); bloqueios, almoço e folga
não têm onde ser desenhados. Falta também a visão Mês.

**2.2 Ações da agenda** — falta "Iniciar" (estado *Em atendimento*), falta "Finalizar e receber"
num gesto só, e um horário passado que nunca foi confirmado não pode ser marcado como falta sem
antes ser confirmado.

**2.3 Início enxuto (§7.1)** — reduzir a exatamente 4 indicadores; **remover o bloco "Acesso
rápido"** que repete o menu (`dashboard/page.tsx:561`, remoção explícita no guia); acrescentar
"Resultado do mês" e "Clientes para chamar"; completar "Precisa da sua atenção" com estoque
baixo e planos vencendo. Todo indicador precisa de período e comparação (§5.4) — hoje é só o
número solto. Dois bugs junto: "Próximo horário" mostra o horário das 9h às 18h, e a contagem
de atendimentos do dia inclui faltas.

**2.4 Perfil do cliente (§7.3)** — não existe rota `/clientes/[id]`. Sem ela, "clicar na linha
abre detalhes" não tem para onde levar, e o pilar G2 — o diferencial que o sócio quer vender —
fica sem vitrine. Cinco abas: Resumo, Histórico, Plano, Valores, Observações. Boa parte do dado
já é calculada pela RPC de inteligência de clientes.

**2.5 Segmentos que faltam** — "Assinantes" e "Inadimplentes" foram prometidos na Fase 3,
adiados para a Fase 4 e nunca entregues. A lista de clientes também não mostra situação do
plano por linha.

**2.6 Nova venda com carrinho (§7.6, pilar G5)** — não existe tela de venda. Busca de produto,
atalhos dos mais vendidos, carrinho responsivo, cliente opcional, vendedor, desconto, forma de
pagamento e "Receber R$ X", com RPC transacional. Já há precedente pronto no repositório
(`sell-membership-sheet.tsx`).

**2.7 Estoque mínimo** — o campo não existe no cadastro de produto, o que torna **todo o alerta
de reposição do G5 inerte**.

---

## Fase 3 — Gestão

**3.1 Financeiro reorganizado (§7.5)** — hoje são 904 linhas numa página só, mais 4 rotas soltas
no menu. O guia pede 6 seções internas: Resumo, Caixa e vendas, Despesas, A receber, Comissões,
Relatórios.

**3.2 Filtro de período livre** — hoje só mês fechado. Sem intervalo livre não há como fechar
quinzena, que é como metade das barbearias paga.

**3.3 Gráfico do §7.5** — recebido em verde, despesas em coral, período anterior tracejado em
cinza. Hoje é serviços × produtos em azul e verde, sem despesa e sem comparação.

**3.4 Comissões completas** — falta "total produzido" (o profissional não consegue conferir a
própria comissão), falta **adiantamento/vale** (prática universal em barbearia — sem ele o dono
continua fazendo a conta no papel), e o "valor a pagar" precisa ser campo calculado, não default
de um input editável.

**3.5 Despesas progressivas** — primeira linha só descrição, valor e vencimento; o resto em
"Adicionar detalhes". Hoje o formulário é genérico e compartilhado com "A receber".

**3.6 A receber com dono** — vincular cliente ao recebível e acrescentar "Cobrar no WhatsApp".

**3.7 Lucro que desconta comissão** — hoje o lucro fica superestimado enquanto o dono não paga a
equipe. Isso ataca diretamente a promessa de marketing do G3 ("Faturamento é o que entra. Lucro
é o que fica").

**3.8 Convite de colaborador (§7.7, regra crítica)** — o guia é explícito: *o proprietário não
deve criar a senha do colaborador*. Hoje o dono cria a senha, ou pede por WhatsApp que a pessoa
se cadastre antes. Trocar por convite por e-mail com o colaborador definindo a própria senha, e
mostrar a situação do convite.

**3.9 Perfil do profissional** — 5 abas (Dados, Serviços e comissões, Horários, Clientes,
Resultados). Hoje editar comissão exige ir a `/comissoes` e editar horário exige ir a
`/equipe/horarios`. O pilar **G4 está entregue pela metade**: o "quanto deve receber" existe,
o "quem produziu" não.

**3.10 Configurações (§7.8)** — 6 seções internas, prévia ao vivo à direita, alternador
Celular|Computador e **um único botão "Salvar alterações"**. Hoje é rolagem única de cartões
independentes: o dono muda cor e contato e sai perdendo metade sem perceber. Falta também a
seção "Dados da barbearia" — o nome do negócio **não pode ser editado depois do cadastro**.

**3.11 Bug de escopo nas folgas** — a listagem de bloqueios filtra só por barbearia, sem filtrar
por profissional: cada profissional vê a folga de todos.

**3.12 Mapa de calor** — dias × horários, com a alternativa textual "melhores e piores horários"
que o §6.2 exige. É o gráfico mais vendável dos cinco.

---

## Fase 4 — Público e mobile

**4.1 Fluxo em 7 etapas (§7.11)** — hoje são 5 numa página rolável. Faltam "Pagamento" e
"Confira e confirme". No desktop falta o resumo fixo à direita; no celular falta uma decisão
por tela.

**4.2 Reconhecer cliente recorrente** — pedir WhatsApp primeiro e preencher o nome sozinho. É
barato e é a diferença entre parecer um formulário e parecer um sistema que conhece o cliente.

**4.3 Remarcar sem falar com ninguém** — a RPC `reschedule_appointment` já existe para o painel,
mas o cliente não tem acesso. Enquanto isso, o pilar G1 promete "menos mensagens" e entrega só a
agenda. A página de autogestão ainda oferece "Remarcar" quando o prazo de cancelamento já passou.

**4.4 Confirmar o que foi gravado** — a tela final monta os dados do estado do navegador, não do
que o servidor salvou (a API devolve só referência, situação e token).

**4.5 Coerência da promessa** — a chamada final da página pública promete confirmação imediata em
texto fixo, sem checar o modo de confirmação. O §7.11 proíbe isso.

**4.6 Estoque na vitrine** — produto sem estoque precisa aparecer como "Indisponível" ou sumir; no
passo de upsell os produtos aparecem **sem foto nenhuma**.

**4.7 Capa curta** — hoje `min-h-[88svh]` com orbs animados, ken-burns, dois chips flutuantes e
seta de rolagem, e o **nome do negócio não aparece na capa**. Três botões sólidos idênticos
competem na mesma tela no celular.

**4.8 Horário de funcionamento** — o dado já vem do banco e não é renderizado.

**4.9 Subrotas mortas** — `/servicos`, `/profissionais` e `/produtos` do tenant são arquivos de 8
linhas que redirecionam para âncoras.

---

## Fase 5 — A camada comercial

**Por quê por último:** depende de decisão de negócio (gateway, preço, nome) e de o produto já
sustentar a promessa. Vender antes de as fases 0–2 fecharem multiplica cancelamento.

**5.1 Gateway de pagamento** — bloqueador de tudo o que vem a seguir. Hoje não existe integração
alguma; `/assinatura:203` diz ao cliente que o pagamento online não está disponível.

**5.2 O pacote anual** *(pedido do sócio)* — o preço anual existe no catálogo (10 mensalidades,
~17% de desconto), mas **a landing só mostra mensal** e a tabela `subscriptions` **não tem coluna
de periodicidade**: o sistema não consegue sustentar uma assinatura anual hoje. Além do banco,
falta: alternador mensal/anual nos cards, anual como opção recomendada, e o mensal precisa ficar
efetivamente mais caro — hoje R$ 49,90 é o preço-base, então não existe desconto, existe só um
preço anual.

**5.3 Cupom e desconto** — não existe entidade de cupom, código promocional nem campo de desconto.
Sem isso a "oferta imperdível no anual" não tem como ser aplicada.

**5.4 O lead deixa de morrer** *(pedido do sócio)* — `saas_leads` só recebe `insert`; ninguém no
time consegue ver quem preencheu o formulário sem abrir o SQL do Supabase. Falta, em ordem:
tela de leads no `/admin`; provedor de e-mail transacional; cron que leia leads sem conversão
após 24h/72h; template da oferta; atualização do estágio de funil (o campo existe, nasce com
`lead_submitted` e nunca é escrito).

**5.5 Posição do formulário** — está na última seção antes do rodapé, depois do CTA final. Quem
abandona no meio nunca o vê. O pedido era capturar *quem não compra na hora*.

**5.6 Landing reescrita** — a apresentação estratégica manda usar os **5 Gs** como arquitetura da
página e abrir pela **dor**, não por lista de recursos. Hoje a página abre com um marquee de
recursos — violação literal da regra "não abrir com uma lista longa de recursos". Faltam: o bloco
de dor, o bloco de fluxo conectado, **telas reais do sistema** (a promessa central é simplicidade
e a página não mostra uma única tela), e o nicho explícito que o sócio definiu — barbearia de 2 a
8 profissionais, dono que ainda atende na cadeira. O `<title>` ainda diz "o sistema completo",
exatamente o que a apresentação desaconselha por não criar posição própria.

**5.7 O diferencial invisível** *(pedido do sócio)* — gestão de clientes e análise de frequência é
o que ele quer vender, e é o que está **mais bem construído no produto e ausente da landing**.
Precisa de bloco dedicado com a pergunta "Quantos clientes sumiram sem você perceber?" e print
real da tela de clientes.

**5.8 Iscas de lead** — a única oferta hoje é "prefere que a gente fale com você?", que exige que
o visitante queira ser abordado. A apresentação sugere diagnóstico dos 5 Gs, calculadora de lucro
e calculadora de comissão.

**5.9 Formulário ilegível no salão** — o card de captura é branco sobre fundo quase branco, com
texto claro sobre fundo claro.

---

## Duas decisões que não são minhas

**O nome.** Trocar "NexoBarber" por outro custa pouco tecnicamente: 25 ocorrências com a grafia
exata mais 11 em minúsculas, em 15 arquivos, além do slug de domínio e dos textos legais. O custo
real é de marca, não de código. Vale observar que "Barber" no nome fecha a porta da vertical de
salão que já existe em produção (`/salao`, `/studio-aurora`).

**A precisão do diagnóstico.** Ele foi feito lendo o código, não clicando no sistema em produção.
Vale rodar a homologação de `docs/homologacao-prompt-agente-web.md` para confirmar em tela os
itens de maior impacto antes de mover a Fase 2.

---

## Ordem sugerida de execução

| Fase | Foco | Depende de |
|---|---|---|
| 0 ✅ | Correção de risco e de número errado | — |
| 1 | Fundação visual e de componentes | — (pode correr junto da 0) |
| 2 | Agenda, Início, perfil do cliente, venda | Fase 1 |
| 3 | Financeiro, comissões, equipe, configurações | Fase 1 |
| 4 | Página pública e fluxo de agendamento | Fase 1 |
| 5 | Gateway, plano anual, régua de lead, landing | Fases 0 e 2 |

As fases 2, 3 e 4 são independentes entre si e podem ser paralelizadas. A fase 5 é a única que
exige as anteriores fechadas — não por dependência técnica, mas porque é ela que traz gente nova
para dentro do produto.
