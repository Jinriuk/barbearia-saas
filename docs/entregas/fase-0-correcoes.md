# Entrega — Fase 0: parar o sangramento

> Os 17 itens da Fase 0 de [`docs/14-plano-de-fases.md`](../14-plano-de-fases.md).
> Nada aqui é melhoria: são números errados, promessas não cumpridas e brechas
> de acesso, todos em produção. **Entrega:** nenhum número exibido pode estar
> errado; nenhuma frase de venda pode prometer o que o produto não faz.

Cada item da auditoria foi reverificado no código antes de ser corrigido. Dois
não sobreviveram à verificação na forma em que estavam escritos — estão na
seção "O que a auditoria errou".

## Banco (`202607280030_fase0_correcoes.sql`)

| Objeto                                                                                                         | Item           | O que resolve                                                                                       |
| -------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------- |
| view `product_stock_balances`                                                                                  | 0.6            | Saldo somado no banco, sobre o ledger inteiro. `security_invoker` para a RLS continuar valendo      |
| trigger `enforce_inventory_balance`                                                                            | 0.8            | Saída maior que o saldo é bloqueada em **qualquer** movimentação, não só na venda                   |
| colunas `appointments.charged_price` / `commission_rate` + trigger `freeze_appointment_commission`             | 0.9            | Preço e taxa congelados na conclusão. Backfill do histórico incluído                                |
| `commission_summary()`                                                                                         | 0.9, 0.14, 0.7 | Comissão somada no banco, com o total produzido e a parcela já recebida                             |
| `income_summary()` (recriada)                                                                                  | 0.11, 0.12     | `receivable` (saldo total) e `receivable_period` (janela) com nome próprio, mais `receivable_count` |
| `cash_summary()`, `income_by_payment_method()`, `revenue_breakdown()`, `income_by_day()`, `financial_report()` | 0.7            | Relatórios, Financeiro e o PDF agregados no banco                                                   |
| trigger `sync_receivable_transaction` + `settle_receivable()` + `sync_receivable_from_transaction`             | 0.10           | Fiado passa a existir para o Financeiro, nos dois sentidos                                          |
| `get_client_insights()` (recriada)                                                                             | 0.13           | Gasto do cliente soma a mensalidade do plano                                                        |
| colunas de consentimento em `saas_leads` + `unsubscribe_saas_lead()`                                           | 0.4            | Prova do aceite (IP, user-agent, versão, data) e caminho de descadastro                             |
| colunas de cancelamento em `subscriptions` + `request_/revoke_subscription_cancellation()`                     | 0.2            | Cancelamento self-service com efeito no fim do período pago                                         |
| coluna `profiles.must_change_password`                                                                         | 0.17           | Senha criada pelo dono vira provisória                                                              |

Testes em [`supabase/tests/fase0b_correcoes.sql`](../../supabase/tests/fase0b_correcoes.sql)
(17 asserções de comportamento) e
[`fase0b_isolamento.sql`](../../supabase/tests/fase0b_isolamento.sql) (o dono da
barbearia A pedindo os números da B em cada objeto novo), ambos em transação com
`ROLLBACK`. A cadeia inteira de migrations
(as 30) foi aplicada num Postgres 16 limpo e o arquivo de teste roda verde.

## Aplicação

| Item | O que mudou                                                                                                                                                                                                                              |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1  | Os 6 depoimentos nominais **fictícios** saíram das duas landings. No lugar, três afirmações verificáveis sobre o que o produto faz. Depoimento só volta com cliente real e autorização por escrito                                       |
| 0.2  | Cartão "Cancelar meu plano" em `/assinatura`, com motivo opcional e confirmação digitada. Encerra no fim do período pago — pedir cancelamento **não** derruba a página pública na hora — e pode ser desfeito. O cron executa a transição |
| 0.3  | O catálogo de planos passou a listar o relatório em PDF no **Padrão**, que é o que o código sempre entregou (ver "O que a auditoria errou")                                                                                              |
| 0.4  | A landing grava data, IP, user-agent e versão do texto aceito; `/descadastro?t=…` dá baixa por token, via POST                                                                                                                           |
| 0.5  | O texto de consentimento usa a marca da vertical (`NexoBarber`/`NexoBeleza`), em `src/lib/leads/consent.ts`. `/assinatura` também deixou de dizer "NexoBarber" para salão                                                                |
| 0.6  | `/produtos` lê a view de saldo. O histórico na tela caiu para 20 linhas, porque nenhuma conta depende mais dele                                                                                                                          |
| 0.7  | `/relatorios`, `/financeiro`, `/comissoes` e o PDF passaram a usar as RPCs de agregação. Onde ainda há corte, a tela diz que há corte                                                                                                    |
| 0.10 | Baixar um recebível liquida a receita que já existe, em vez de criar uma segunda                                                                                                                                                         |
| 0.12 | Título e selo mostram a contagem real; o texto abaixo diz quantos estão sendo exibidos                                                                                                                                                   |
| 0.14 | `/comissoes` diz na tela que o regime é **competência** e mostra quanto da comissão já corresponde a dinheiro em caixa. Ganhou também o "Total produzido"                                                                                |
| 0.15 | Trocar senha exige a senha atual (verificada num cliente separado, sem tocar nos cookies da sessão), com limite de tentativas e opção "sair dos outros aparelhos"                                                                        |
| 0.16 | `/clientes` checa `clients:manage` e não engole mais o erro da RPC — a tela para de dizer "nenhum cliente cadastrado" quando a consulta falhou                                                                                           |
| 0.17 | A senha que o dono digita é provisória: o painel redireciona para a troca no primeiro acesso                                                                                                                                             |

### Detalhe do 0.15 que não é óbvio

`/atualizar-senha` atendia **duas** jornadas com a mesma ação: recuperação por
e-mail (quem não sabe a senha antiga) e troca comum. Exigir a senha atual ali
quebraria a recuperação; **não** exigir deixaria a URL como desvio da
reautenticação — bastaria abri-la numa sessão esquecida no balcão.

A separação: `changePassword` (Minha conta) exige a senha atual;
`setNewPassword` (/atualizar-senha) só aceita quem tem cookie de recuperação
emitido pelo callback do link, ou `must_change_password` (colaborador no
primeiro acesso). Fora disso, manda para Minha conta.

## A revisão da própria Fase 0 (migration `202607280031`)

Uma revisão adversarial do diff — cinco dimensões, cada achado atacado por um
cético — derrubou dois furos que **anulavam o §0.15 inteiro**, mais três erros
de borda. Todos corrigidos e cobertos em
[`supabase/tests/fase0c_revisao_seguranca.sql`](../../supabase/tests/fase0c_revisao_seguranca.sql)
(11 asserções).

**O cookie de recuperação era forjável.** A marca de "esta sessão veio de um
link de e-mail" era um cookie httpOnly de valor fixo. `httpOnly` protege contra
o JavaScript da página, não contra a pessoa sentada no aparelho, que cria o
cookie na mão pelo DevTools — e o cenário do §0.15 é exatamente o painel aberto
no balcão. A marca virou uma concessão guardada em `password_recovery_grants`,
emitida só pelo callback e só com `service_role`, com validade de 30 minutos e
consumida na primeira troca.

**O callback descartava o resultado da troca do código.** Um `code` inválido não
derruba a sessão que já está no navegador, então `/auth/callback?code=x&next=/atualizar-senha`
"dava certo" com a sessão antiga e liberava a troca de senha. Agora a concessão
só sai quando `exchangeCodeForSession` devolve sessão de verdade.

**`must_change_password` era escrita pelo próprio usuário.** A policy de update
do perfil não restringe coluna: bastava marcar a própria linha como `true` para
abrir a mesma janela. A coluna saiu do alcance do `UPDATE` direto (gatilho
`protect_must_change_password`, `security invoker` para enxergar quem escreve);
baixar a marca passou a ser uma RPC `security definer`.

**`signOut()` do cliente verificador é global por padrão.** Ele revogava todos
os refresh tokens do usuário no GoTrue — inclusive o da sessão que acabou de
pedir a troca. Trocar a senha derrubava a própria pessoa mesmo sem marcar "sair
dos outros aparelhos". Passou a `scope: "local"`.

**Redirecionamento aberto em `/auth/callback`.** `next.startsWith("/")` aceita
`//host`, que o `URL` resolve para outro domínio. O `signIn` já se protegia; o
callback não.

**Cancelar assinatura vencida prometia uma data no passado**, e reativar um
plano já encerrado pelo cron respondia "Plano reativado" sem ter mudado nada.

## O que a auditoria errou

**0.3 — a direção estava invertida.** A auditoria dizia que a landing anunciava
o PDF no Padrão e o código o entregava só no Plus. O código não restringe nada:
`src/app/(print)/relatorio-financeiro/page.tsx` checa apenas o papel
(`finance:view`), sem `isPlus`. Quem estava errado era a **lista de features**
do catálogo, que colocava "Relatórios em PDF" como exclusivo do Plus. Tirar o
PDF da landing removeria de clientes do Padrão uma função que eles já usam e
que já foi prometida. O catálogo foi alinhado ao código.

**0.11 — mudar `receivable` teria quebrado o painel.** A auditoria pedia que o
card "A receber" respeitasse o período. Mas `dashboard/page.tsx:327` usa a mesma
coluna para o **saldo devedor total**, ao lado de "Recebido hoje/semana/mês",
onde o total é o número certo. Trocar a semântica da coluna teria mudado o
painel em silêncio. A coluna antiga ficou como está e o recorte entrou como
`receivable_period`; o Financeiro rotula os dois.

## Fora da lista, mesma classe de defeito

Corrigidos porque a entrega da fase é "nenhum número exibido pode estar errado":

- **O PDF financeiro** repetia o padrão do 0.7 — três varreduras sem limite,
  somadas no cliente. É o documento que a dona imprime e arquiva.
- **`income_by_day` apura o dia no fuso da barbearia.** `timestamptz::date`
  resolve em UTC: um pagamento das 22h de 30/junho em São Paulo cairia em julho.
- **O selo de reservas pendentes** em `/produtos` anunciava o tamanho da página
  (100) como se fosse o total.
- **Anular uma venda deixava a comissão de pé.** `income_summary` já tira a
  receita anulada de "Vendido"; a comissão continuava contando o mesmo
  atendimento, e as duas telas mostravam realidades diferentes. Atendimento sem
  receita nenhuma (coberto por plano) segue contando, que é o correto.
- **Apagar um fiado pendente** quebrava na primeira versão do gatilho: a FK
  `accounts_receivable.transaction_id` é `on delete set null`, então apagar a
  receita dentro de um `BEFORE DELETE` tentava atualizar a própria linha em
  remoção (`tuple to be deleted was already modified`). O gatilho de DELETE é
  `AFTER`. O caso está no arquivo de teste.

## Decisões de produto tomadas com o sócio

| Item | Decisão                                                                 |
| ---- | ----------------------------------------------------------------------- |
| 0.2  | Implementar o cancelamento, não trocar a frase                          |
| 0.14 | Manter competência e deixar explícito na tela, com o recebido ao lado   |
| 0.3  | Seguir o código como verdade (que, verificado, entrega o PDF no Padrão) |

## O que a Fase 0 deliberadamente não resolveu

- **Convite de colaborador por e-mail** (§3.8): aqui a senha do dono virou
  provisória, que é a mitigação. O convite real é da Fase 3.
- **Comissão sobre atendimento coberto por plano**: o profissional recebe
  comissão sobre o preço de catálogo do serviço, enquanto a receita entrou pela
  mensalidade do plano, que pode ser menor. É regra de negócio a definir, não
  defeito de cálculo.
- **Assimetria de "A pagar"**: só o recebível ganhou receita espelhada. A
  despesa continua contando apenas quando paga, que é o regime do lucro.

## Verificação

`npm run typecheck`, `npm run lint` e `npm run test` (54 testes) passam. A
migration foi aplicada numa cadeia limpa em Postgres 16 e o arquivo de teste SQL
rodam verdes (17 de comportamento, 4 de isolamento, 11 de segurança).
