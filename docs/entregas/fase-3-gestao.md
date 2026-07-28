# Entrega — Fase 3: Gestão

> Fase 3 do [plano de fases](../14-plano-de-fases.md), derivado da
> [auditoria de julho de 2026](../13-auditoria-julho-2026.md). Os 12 itens
> (3.1 a 3.12) foram entregues. É a fase que sustenta os pilares **G3**
> (lucro) e **G4** (equipe) na hora da demonstração.
>
> Entregue **sobre** as Fases 0, 1 e 2, que entraram na `main` enquanto esta
> estava em curso. Nada aqui desfaz aquilo: a migração 0035 ESTENDE as
> funções da Fase 0 (§0.9 preço congelado, §0.11/§0.12 a receber, §0.14
> competência × caixa), as telas adotam as primitivas da Fase 1 (MaskedInput,
> `Alert variant="success"`, alturas de toque) e as somas usam
> `revenue_breakdown`, que a Fase 2.6 ensinou a enxergar a venda de balcão.

## O que entrou, item a item

### 3.1 Financeiro em seis seções (§7.5)

Eram 904 linhas numa página só, mais quatro rotas soltas no menu (Despesas,
A receber, Comissões, Relatórios) que o dono precisava caçar uma a uma.
Virou um endereço com seis seções internas — Resumo, Caixa e vendas,
Despesas, A receber, Comissões, Relatórios — em `/financeiro?secao=…`.

As rotas antigas (`/contas-a-pagar`, `/contas-a-receber`, `/comissoes`,
`/relatorios`) **continuam existindo** e redirecionam para a seção
correspondente: favorito do dono e atalho gravado no celular não quebram. O
menu lateral passou de cinco entradas de Financeiro para uma.

### 3.2 Filtro de período livre

Atalhos (hoje, esta semana, este mês, mês passado, últimos 30 dias) e
intervalo de/até. Sem ele não havia como fechar **quinzena**, que é como boa
parte das barbearias paga a equipe.

Três decisões que fazem diferença no uso:

- o período sobrevive à troca de seção e vira URL — o dono guarda "minha
  quinzena" nos favoritos;
- o `até` é **inclusivo** para quem lê a tela (1 a 15 inclui o dia 15
  inteiro) e vira exclusivo internamente;
- a comparação usa a janela anterior de **mesma duração**, encostada no
  início da atual: 15 dias comparam com os 15 dias anteriores, não com "o
  mês passado".

É um `<form method="get">`: funciona sem JavaScript de cliente.

### 3.3 Gráfico do §7.5

Recebido em verde, despesas em coral, período anterior tracejado em cinza —
com alternativa textual embaixo. A série é agregada no banco
(`cash_flow_series`): somar no cliente herdaria o teto de linhas do
PostgREST, que é a família do item 0.7 da auditoria.

O componente novo lê o tema pela classe `dark` no `<html>` — que é o sinal
que este projeto realmente usa — e não por `prefers-color-scheme` nem
`data-theme`, onde o gráfico antigo erra (item 1.2 da Fase 1).

### 3.4 Comissões completas

A Fase 0 §0.9 já tinha levado o fechamento para o banco e congelado o preço
na conclusão. Esta fase **acrescenta colunas à mesma função**, sem tocar na
base de cálculo — `produced`, `commission`, `received_produced`,
`received_commission` e `completed_count` continuam idênticos. Entraram as
três peças que faltavam:

- **Total produzido** (serviços + produtos) — sem ele o profissional não
  consegue conferir a própria comissão, e conferência de comissão é o que
  evita briga. O produto vem das **duas portas** da Fase 2.6 (reserva
  confirmada no agendamento e venda de balcão, esta com o desconto rateado e
  arredondado ao centavo), para a ficha do profissional não divergir do
  Financeiro;
- **Adiantamento/vale** — prática universal em barbearia. O vale sai do
  caixa na hora (despesa paga) e é abatido do fechamento, nunca somado duas
  vezes;
- **Valor a pagar como campo calculado**, não default de input editável.
  Quem quiser pagar diferente abre "pagar valor diferente" e assume a
  escolha.

### 3.5 Despesas progressivas

Primeira linha: o que foi, valor e vencimento. Categoria e observação atrás
de "Adicionar detalhes", fechado por padrão — lançar o aluguel do mês
precisa custar três campos. O formulário deixou de ser genérico e
compartilhado com "A receber". A categoria é o que faz a seção responder
"para onde foi o dinheiro".

### 3.6 A receber com dono

Cliente vinculado ao recebível e **"Cobrar no WhatsApp"** com o texto pronto
e editável — quem cobra é o dono, não o sistema. Sem dono, "A receber" era
uma lista de dívidas sem devedor.

A contagem real do título (§0.12) e a distinção entre saldo total e recorte
do período (§0.11) vieram da Fase 0; a seção mostra os dois números com
rótulos que dizem qual é qual, e usa o rótulo de categoria dela — fiado
aparece como "Fiado", não como "Serviço".

### 3.7 Lucro que desconta comissão

`income_summary` ganhou `commissions_accrued` e `profit_after_commissions`.
O Resumo mostra os dois lucros em cartões separados e explica a diferença:
o de caixa (o que sobrou hoje) e o depois da comissão (o que de fato sobra
quando a equipe for paga). Enquanto o dono não paga, o primeiro fica
inflado — e é o segundo que sustenta a promessa do G3.

A comissão **já paga** dentro da janela é devolvida antes do desconto:
sem isso a equipe seria descontada duas vezes.

### 3.8 Convite de colaborador (regra crítica do §7.7)

O guia é categórico: _o proprietário não deve criar a senha do colaborador_.
Até aqui o dono digitava a senha da pessoa e a passava por WhatsApp — uma
senha que ela não escolheu, que trafega em texto puro e que o dono conhece.

Agora o convite vai por e-mail e a senha nasce com quem vai usá-la. O aceite
(associação, ficha de profissional, serviços marcados, expediente padrão e
regra de pagamento) é aplicado no retorno do link, de forma **idempotente** —
duplo clique no link não gera dois profissionais.

Quem já tem conta não recebe um link que não funcionaria: o acesso é liberado
na hora e a tela avisa o dono. A lista mostra aguardando / aceito / vencido /
cancelado, com reenviar e cancelar.

O caminho antigo foi **removido**, não escondido: `createProfessionalWithAccess`
e `inviteMember` saíram do código. Deixar disponível uma action que cria senha
alheia manteria a regra crítica violável por outro botão.

### 3.9 Ficha do profissional

Rota nova `/profissionais/[id]` com as cinco abas do guia: Dados, Serviços e
comissões, Horários, Clientes e Resultados. O pilar **G4 estava entregue pela
metade** — o sistema respondia "quanto deve receber" mas não "quem produziu".
Editar comissão exigia ir a `/comissoes`; editar horário, a
`/equipe/horarios`. Agora as duas coisas vivem na ficha da pessoa, junto da
carteira de clientes dela.

Permissão: um profissional abre a própria ficha; ver a de outro exige gestão
de equipe, e os valores produzidos só aparecem para quem tem acesso ao
financeiro.

### 3.10 Configurações (§7.8)

Seis seções internas (Dados da barbearia, Aparência, Página de agendamento,
Horário de funcionamento, Regras de agendamento, Lembretes), prévia ao vivo à
direita com alternador **Celular | Computador** e **um único botão "Salvar
alterações"**.

Era rolagem única de cartões independentes, cada um com o próprio botão: o
dono mudava a cor e o contato, salvava um, e saía perdendo o outro sem
perceber. As seis actions antigas foram removidas junto com os cartões — um
"salvar tudo" convivendo com seis "salvar isto" reproduziria o problema.

Entrou também a seção **Dados da barbearia**: o nome do negócio não podia ser
editado depois do cadastro. Digitou errado no cadastro, ficava errado para
sempre.

Dois detalhes que o formulário único exige:

- as seções inativas são **escondidas por CSS, não desmontadas** — campo
  desmontado não entra no FormData, e um "salvar tudo" que só grava a aba
  aberta seria pior que o problema original;
- os campos de aparência chegam **desabilitados** no plano Padrão (e
  desabilitado não entra no FormData), então a validação é dividida em duas:
  exigir cor e título num schema único faria o salvamento inteiro falhar para
  todo tenant Padrão.

### 3.11 Bug de escopo nas folgas

A listagem de bloqueios filtrava só por barbearia. Cada profissional
enxergava a folga de todos os colegas, e o dono via, dentro do painel
"Expediente de Fulano", bloqueios que não eram de Fulano. O cartão inteiro —
lista e criação — passou a ser do profissional selecionado.

### 3.12 Mapa de calor

Dias × horários, com a alternativa textual de **melhores e piores horários**
que o §6.2 exige. Um dia inteiro sem atendimento é lido como dia fechado, não
como dia fraco — senão a resposta seria sempre "às 3 da manhã". Agregado no
banco (`appointment_heatmap`), no fuso do tenant.

## Banco

Migração `202607280030_fase3_gestao.sql`:

- `employee_advances` (vale) e `team_invites` (convite), com RLS e FKs
  compostas por tenant;
- `accounts_payable.category` / `.notes` e `accounts_receivable.notes`;
- `commission_summary(barbershop, from, to, timezone)` — fechamento por
  profissional no banco;
- `income_summary` v3 — mesmas colunas de antes, com o mesmo significado,
  mais `commissions_accrued` e `profit_after_commissions`;
- `cash_flow_series` — série do gráfico agregada;
- `appointment_heatmap` — mapa de calor no fuso do tenant;
- `profile_id_by_email` — resolve o caso "a pessoa convidada já tem conta",
  restrito a quem administra a equipe daquela barbearia;
- índices por `(barbershop_id, status, starts_at)` e
  `(barbershop_id, paid_at, professional_id)`.

## Decisões registradas (docs/05)

- **Regime.** Receita e despesa continuam em caixa; a comissão é apurada por
  competência (atendimento concluído no período), porque é assim que a
  barbearia fecha o mês da equipe. Os dois números convivem em colunas
  separadas e a tela diz qual é qual — a auditoria reclamava da mistura
  silenciosa (item 0.14).
- **Base da comissão.** Mantida a regra vigente da Fase 4: taxa do serviço
  quando > 0, senão a taxa padrão do profissional, sobre o preço do serviço.
  Congelar o valor transacionado é o **item 0.9 da Fase 0** e não foi feito
  aqui: trocar a base junto com a reorganização da tela tornaria impossível
  saber qual mudança moveu o número. O que mudou foi **onde a conta roda**.
- **Total produzido** usa a mesma base da comissão para serviços, mais a
  receita de produtos confirmados atribuída ao profissional.
- **Vale** entra como despesa paga na hora e é abatido do valor a pagar do
  período; o pagamento final registra só o saldo.

## Validação

- `supabase/tests/fase3_gestao.sql`: 8 blocos verdes (fechamento com
  precedência da taxa do serviço, modelos fixo/híbrido/sem-regra, vale acima
  da produção não vira valor negativo, lucro depois da comissão com devolução
  do salário já pago, série do gráfico, mapa de calor ignorando cancelado,
  unicidade do convite pendente com revogado liberando novo, isolamento entre
  tenants).
- Regressão: as **12 suítes** anteriores (`vistoria`, `fase0`…`fase4b`,
  incluindo as três novas da Fase 0 e as duas da Fase 2) verdes contra um
  banco reconstruído do zero com as **36 migrações** em ordem.
- `src/lib/dates/period.test.ts`: 9 casos do filtro de período. Um deles
  pegou um defeito real durante a implementação — o rótulo do intervalo era
  formatado em UTC e mostrava um dia a mais no fim da janela.
- `npm run lint && npm run typecheck && npm test && npm run build` verdes.

## Deploy

As migrações **0035 e 0036** precisam ser aplicadas **junto** do deploy deste
código.

`income_summary` e `commission_summary` são recriadas com colunas novas no
fim, preservando as anteriores com o mesmo significado — quem lê por nome não
quebra, mas o código novo não funciona sem elas. A 0036 é independente e pode
ir antes: só conserta a venda de balcão.

O convite por e-mail depende de o Supabase Auth estar com o remetente
configurado e com `${NEXT_PUBLIC_APP_URL}/auth/callback` na lista de URLs de
redirecionamento permitidas.

## Achado durante o merge: a venda de balcão não gravava

Rodando `supabase/tests/fase2_operacao_diaria.sql` contra um banco
reconstruído do zero, `create_counter_sale` falhava em **toda** chamada:

    column "status" is of type financial_status but expression is of type text

Um `CASE` cujos dois braços são literais sem tipo resolve para `text`
(`pg_typeof` confirma), e Postgres não converte `text` para enum
implicitamente. A exceção derrubava a transação inteira — nenhuma venda de
balcão era gravada, o estoque não baixava e a receita não entrava. A tela
"Nova venda" do §7.6 (pilar G5) estava inteiramente inoperante.

**Não é regressão desta fase**: reproduz na 0034 sozinha, sem a 0035.
Corrigido na migração `202607280036_fix_venda_balcao_status.sql`, que recria
a função com o cast explícito e nada mais — migração aplicada não se edita.

Como a suíte abortava naquele ponto, tudo depois dela nunca era avaliado.
Ao destravar apareceu um segundo problema, este na **fixture** do teste: ela
inseria `membership_payments` sem `transaction_id`, e `get_client_insights`
soma o gasto do assinante pela transação de propósito (cobrança estornada não
pode contar como gasto). A fixture passou a gravar o pagamento como
`sell_customer_membership` grava.

## Fora desta entrega (registrado)

- **Fase 1** — a fundação visual entrou na `main` e as telas desta fase
  adotaram as primitivas dela. O que segue fora daqui é o que a própria Fase
  1 deixou aberto, não algo que esta fase devia.
- **2.7** — a coluna `products.minimum_stock` existe no banco; o campo no
  cadastro de produto é da Fase 2.
