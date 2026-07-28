# Entrega — Fase 2 do plano de julho: o que o barbeiro usa todo dia

Referência: [`docs/14-plano-de-fases.md`](../14-plano-de-fases.md) §Fase 2, derivada da
[auditoria de julho de 2026](../13-auditoria-julho-2026.md).

Estado da verificação: `npm run lint`, `npm run typecheck`, `npm test` (54 testes) e
`npm run build` passam. Os testes de banco desta fase estão em
`supabase/tests/fase2_operacao_diaria.sql` (transação com `rollback`, como os anteriores)
e **não foram executados contra um Postgres** nesta entrega — precisam rodar na
homologação junto com as migrations.

---

## Migrations

| Arquivo                                        | Conteúdo                                                                                                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `202607280030_fase2_estado_em_atendimento.sql` | Só o valor `in_progress` no enum. Mora sozinho porque o Postgres proíbe **usar** um valor de enum na mesma transação em que ele é criado — e a exclusion constraint precisa citá-lo. |
| `202607280031_fase2_operacao_diaria.sql`       | Todo o resto: máquina de estados, estoque, venda de balcão, "finalizar e receber", clientes v2 e perfil.                                                                             |

---

## 2.1 e 2.2 — Agenda de verdade

A agenda deixou de ser lista. `src/components/dashboard/agenda-board.tsx` desenha a grade:
eixo de horas na lateral, **profissionais em colunas** na visão Dia, **dias em colunas** na
Semana, cartão posicionado no tempo com faixa colorida por situação, e linha de "agora".

- **Alternador Dia | Semana | Mês | Lista** (§7.2.2). Mês vem de `get_agenda_month`,
  agregada no banco — um mês de uma equipe de 8 estoura o teto de linhas do PostgREST.
- **Cabeçalho com a data por extenso e setas anterior/próximo/Hoje** (§7.2.1).
- **Clique em área vazia abre o cadastro já preenchido** (§7.2.4): a grade semeia
  profissional, dia e hora; o painel confirma o horário contra a mesma RPC de
  disponibilidade da página pública antes de deixá-lo selecionado (o clique não fura fila).
- **Expediente, bloqueios e folgas desenhados**: fora do expediente a coluna fica apagada;
  bloqueio vira retângulo hachurado com o motivo, recortado por dia quando atravessa vários.
- **Filtro de profissional com foto** (§7.2.3).
- **Clicar no cartão abre o detalhe** (`appointment-detail-sheet.tsx`), de onde saem todas
  as ações — inclusive as duas que não existiam:
  - **Iniciar** → estado `Em atendimento`;
  - **Finalizar e receber** → conclui e captura o pagamento num gesto só, via
    `complete_and_receive_appointment`. Serviço coberto por plano não pede dinheiro: a RPC
    devolve `covered` e a tela diz "coberto pelo plano do cliente".
- **Falta sem confirmar antes**: `pending → no_show` passou a ser transição válida. Antes o
  balcão precisava confirmar um atendimento que não aconteceu para poder marcá-lo como falta.

Consequências no banco que **não podiam ficar de fora** ao adicionar `in_progress`:
a exclusion constraint da agenda e o `get_public_availability` passaram a contar
`in_progress` como horário ocupado. Sem isso, iniciar um atendimento liberaria o horário
para outra reserva.

## 2.3 — Início enxuto

- **Exatamente 4 indicadores** (§7.1.2): Dinheiro recebido hoje, Atendimentos de hoje,
  Valores a receber e Pendências. Cada um com período e comparação (§5.4) — o de hoje
  compara com ontem, com seta.
- **"Acesso rápido" removido** (remoção explícita no guia): eram 8 destinos que repetiam o
  menu lateral.
- **Duas colunas** (§7.1.4): à esquerda a agenda de hoje e os lembretes de amanhã; à direita
  **Resultado do mês** (vendido, despesas pagas, lucro) e **Clientes para chamar** com o
  texto de WhatsApp pronto.
- **"Precisa da sua atenção" com os 5 tipos**: entraram estoque baixo e planos vencendo,
  que faltavam.
- **Dois defeitos corrigidos**: "Próximo horário" mostrava o primeiro horário do dia mesmo
  às 18h (agora é o próximo de verdade), e a contagem de atendimentos do dia incluía faltas.
- Cabeçalho com data, botão dourado **+ Novo agendamento** (o painel real, não um link) e
  **Página de agendamento** (§7.1.1).

## 2.4 e 2.5 — Perfil do cliente e segmentos

- **Rota `/clientes/[id]`** com as cinco abas do §7.3: Resumo, Histórico, Plano, Valores e
  Observações. O cabeçalho traz gasto total, gasto médio, próximo retorno e profissional
  habitual, mais "Chamar no WhatsApp" e "Novo agendamento".
  - Histórico: `get_client_history` — data, serviço, profissional, valor, forma de
    pagamento e a marca "Coberto pelo plano".
  - Valores: `get_client_payments` — atendimentos, vendas de balcão e pagamentos de plano.
  - Observações: o campo `notes` era gravado e **nunca exibido de volta**. Agora aparece e é
    editável.
- **O nome na lista virou link** — antes não havia nenhum caminho para o cliente.
- **Segmentos Assinantes e Inadimplentes**, prometidos na Fase 3 do plano antigo, adiados
  para a 4 e nunca entregues. A RPC rejeitava esses valores.
- **Situação do plano por linha**, com os quatro estados do §7.4. O estado "Vence em breve"
  não existia no modelo, e "em dia" era pintado de dourado — a cor de marca — o que fazia
  amarelo significar "tudo certo", o oposto do que o guia estabelece.
- **Três indicadores no topo** (§7.3.2): Clientes ativos, Clientes para chamar e Planos
  vencendo.
- **Cadastro em painel lateral** e **edição de cliente pela interface** (§7.3): o formulário
  vivia permanentemente aberto ao lado da lista, e um telefone digitado errado não tinha
  conserto pela tela.

## 2.6 — Nova venda com carrinho

Rota nova `/vendas` (`counter-sale-form.tsx`): busca de produto, **atalhos dos mais
vendidos** (`get_top_products`, as duas fontes de venda dos últimos 90 dias), carrinho à
direita no computador e fixo embaixo no celular, cliente opcional, vendedor, desconto,
forma de pagamento e o botão **"Receber R$ X"**.

O modelo de dados precisou de duas tabelas: `appointment_products` exige `appointment_id`,
então uma venda de balcão não tinha onde morar. `counter_sales` + `counter_sale_items`
resolvem sem distorcer o upsell do agendamento, e a RPC `create_counter_sale` grava itens,
baixa de estoque e receita **na mesma transação** — falta de estoque em qualquer item
derruba a venda inteira. Sem forma de pagamento a receita nasce pendente, como manda a
verdade financeira da Fase 0.

O relatório "Vendas de produtos" do Financeiro passou a ler as duas fontes
(`get_product_sales`, agregada no banco, com o desconto da venda rateado por item). Sem
isso uma venda avulsa entraria no total do mês e sumiria da tabela ao lado.

## 2.7 — Estoque mínimo

O campo `products.minimum_stock` **já existia no banco desde o schema inicial** — o que
faltava era o campo no formulário e no schema de validação, então ele ficava travado no
default 0 e todo o alerta de reposição do G5 nunca disparava. Agora é editável, e a lista
de produtos ganhou as colunas "Mínimo" e "Última movimentação".

---

## Itens da Fase 0 puxados para cá

Três correções da Fase 0 entraram nesta entrega porque a Fase 2 é construída em cima delas.
Estão registradas aqui para não parecerem escopo perdido:

| Item                                                                | Por que veio junto                                                                                                                                                                                                          |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0.6** — saldo de estoque somado sobre 400 movimentações truncadas | A tela de venda e o alerta de estoque mínimo leem esse saldo. Construir a venda sobre um número que vira ficção na 401ª movimentação seria construir sobre areia. Agora `get_product_stock` soma o ledger inteiro no banco. |
| **0.8** — estoque negativo possível                                 | A venda de balcão precisa de uma trava transacional; a que existia valia só no caminho da reserva. Trigger `BEFORE INSERT` em `inventory_movements`, com `FOR UPDATE` no produto.                                           |
| **0.13** — gasto do assinante aparece como R$ 0,00                  | O perfil do cliente é a vitrine do pilar G2. Abrir a tela do cliente mais valioso mostrando zero era inaceitável. O gasto agora soma receita de atendimento, venda de balcão e pagamento de plano.                          |

Uma correção de segurança da Fase 0 também entrou, pelo mesmo motivo:

- **0.16** — `/clientes` não checava permissão e engolia o erro da RPC em silêncio. Como a
  página foi reescrita para os segmentos novos, o `can(...)` e o estado de erro entraram
  junto. Qualquer `NOT_AUTHORIZED` virava a tela "Nenhum cliente cadastrado".

---

## O que ficou de fora, e por quê

- **Fase 1 não foi executada.** A Fase 2 depende dela no plano. As telas novas usam os
  componentes como estão hoje: sem toast (a mensagem de sucesso aparece em `Alert` dentro
  do próprio painel), sem máscaras, com o painel lateral em `w-3/4` no celular e com os
  selos de situação ainda com `canceled`/`no_show` invertidos. **Quando a Fase 1 rodar,
  essas telas herdam as correções sem precisar ser refeitas** — nenhuma delas fixa cor,
  altura ou máscara por conta própria.
- **Produtos reservados não são baixados pelo "Finalizar e receber".** A ação conclui o
  atendimento e recebe o serviço; a reserva de produto continua sendo confirmada em
  Produtos e Estoque. Juntar as duas faria um item sem estoque derrubar a conclusão do
  atendimento, que é pior. O detalhe do atendimento mostra os produtos reservados e diz
  onde confirmá-los.
- **A visão Semana não desenha bloqueios quando nenhum profissional está filtrado** —
  empilhar as folgas de toda a equipe numa coluna por dia engana mais do que informa.
  Escolha um profissional e eles aparecem.
- **Área única com abas Serviços | Produtos | Estoque | Vendas** (§7.6) não foi feita:
  `/vendas` nasceu como rota própria. A reorganização em abas é reforma de navegação e
  pertence à discussão do §9 (o menu tem 15 destinos onde o guia pede 7), que é da Fase 1.

---

## Verificar em homologação

1. Aplicar as duas migrations **em ordem** e rodar `supabase/tests/fase2_operacao_diaria.sql`.
2. Agenda: abrir a visão Dia com dois ou mais profissionais e conferir colunas, expediente
   apagado fora do horário e um bloqueio desenhado.
3. Clicar num espaço vazio e conferir que o painel abre com profissional e dia preenchidos e
   que, ao escolher o serviço, o horário clicado aparece já selecionado.
4. Iniciar um atendimento e conferir que o horário continua indisponível na página pública.
5. Finalizar e receber um atendimento de um assinante cujo serviço esteja no plano: não pode
   pedir pagamento.
6. Vender no balcão um produto com saldo menor que a quantidade: a venda inteira precisa
   falhar, sem baixar nada.
7. Conferir que o valor da venda com desconto bate entre "Vendido no mês" e a tabela
   "Vendas de produtos".
