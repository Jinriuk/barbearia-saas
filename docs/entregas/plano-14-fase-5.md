# Entrega — Fase 5 do plano de fases (docs/14): a camada comercial

> Data: 2026-07-31 · Branch `claude/analise-plano-fases-whrzk6`
> Escopo: itens 5.1 a 5.9 de [docs/14-plano-de-fases.md](../14-plano-de-fases.md),
> lastreados na [auditoria de julho](../13-auditoria-julho-2026.md) e na apresentação estratégica.
> Banco: `202607310038_fase5_camada_comercial.sql`, **já aplicada em produção**.

## Duas decisões de negócio tomadas pelo sócio antes de começar

**Gateway: Mercado Pago.** Além de ser a escolha do sócio, era a que o schema já
apontava — `subscriptions.mp_preapproval_id` e `mp_payer_email` existiam desde a
Fase 2B — e é a única dos candidatos que faz assinatura recorrente com Pix e
boleto no Brasil.

**Preço: o mensal encarece, o anual fica.** Padrão R$ 49,90 → **R$ 59,90/mês**,
Plus R$ 99,90 → **R$ 119,90/mês**; anual segue R$ 499 e R$ 999. Era exatamente o
buraco do §5.2: enquanto o anual fosse 10 mensalidades do preço-base, não existia
desconto — existia só um preço anual. Agora o anual é **31% mais barato**
(R$ 41,58/mês contra R$ 59,90). Como `plan_prices` é versionado por vigência e
`subscriptions.price_cents` trava o preço da assinatura, **ninguém que já assina
foi retarifado**.

## Resultado por item

**5.1 — Gateway de pagamento.** A tela de assinatura dizia ao dono, em texto
fixo, que o pagamento online não estava disponível e o mandava falar com o
suporte. Agora ela contrata.

O caminho: o servidor grava a intenção de compra em `billing_checkouts`
**antes** de falar com o provedor (plano, periodicidade, preço de tabela,
desconto e total), cria o `preapproval` no Mercado Pago com esse id como
`external_reference` e manda o dono para o `init_point`. Quando a notificação
volta, `/api/webhooks/mercadopago` confere a assinatura `x-signature` (HMAC sobre
o manifesto `id;request-id;ts`, com janela anti-replay), **consulta o recurso na
API do provedor** em vez de acreditar no corpo do POST, e lê plano e valor do
checkout gravado. Notificação forjada com chave vazada ainda assim não inventa
compra: o valor precisa bater com o que o servidor gravou (`AMOUNT_MISMATCH`).

Idempotência por `billing_events` (unique por `provider` + id da notificação):
reenvio responde 200 e não estende período de novo.

A transição de estado saiu das rotas para `src/lib/billing/apply.ts`, porque
agora existem dois webhooks — o genérico da Fase 2B e o do gateway — e "o que um
pagamento aprovado faz com a assinatura" não pode ter duas versões.

Sem `MERCADOPAGO_ACCESS_TOKEN` **nada disso liga**: a tela volta a mostrar o
aviso do suporte e o webhook responde 503. O produto roda em produção sem a
credencial, como já rodava.

**5.2 — O pacote anual.** `subscriptions` ganhou `billing_period` — sem ela o
sistema não conseguia sustentar uma assinatura anual, porque todo pagamento
comprava 30 dias. As duas landings ganharam alternador mensal/anual com o **anual
selecionado por padrão** e a economia em duas contas: "economiza R$ 219 no ano" e
"sai por R$ 41,58/mês". A escolha viaja da landing até a cobrança: `/cadastro`
carrega `periodo`, o cadastro guarda no metadata e a assinatura de teste já nasce
marcada.

**5.3 — Cupom e desconto.** Entidade nova (`coupons` + `coupon_redemptions`),
com percentual ou valor fixo, restrição por plano e periodicidade, janela de
validade, teto de resgates e trava de um resgate por barbearia. A conferência é
por RPC `security definer`: o visitante descobre se o **código dele** vale, sem
poder listar o catálogo de descontos. O resgate acontece na confirmação do
pagamento, nunca no clique.

Detalhe que quase virou desconto vitalício: um `preapproval` cobra sempre o mesmo
valor. Como o cupom é de primeira cobrança, o webhook **devolve a recorrência ao
preço de tabela** logo depois de ativar.

**5.4 — O lead deixa de morrer.** Era o pedido do sócio mais distante de ser
atendido: o lead entrava em `saas_leads` e ninguém no time conseguia nem _ver_
quem havia preenchido sem abrir o SQL do Supabase. Entregue em quatro partes:

- **Tela `/admin/leads`** com filtro por etapa do funil, contatos clicáveis
  (WhatsApp e e-mail), origem/UTM, o que a régua já enviou e falhas de entrega.
- **E-mail transacional** atrás de `sendEmail`, adaptador Resend. Sem
  `RESEND_API_KEY` nada é enviado e nada quebra.
- **Cron diário** `/api/cron/leads`: 24h depois, o e-mail que lembra a dor;
  72h depois, a oferta com o cupom `VOLTA20` (20% no anual). O carimbo só é
  gravado **depois** do "ok" do provedor — nunca se marca como contatado quem
  não foi.
- **`funnel_stage` sendo escrito**: o campo existia desde a Fase 2B e nascia
  `lead_submitted` para morrer assim. Agora percorre
  `nurture_24h_sent` → `nurture_72h_sent` → `converted`/`opted_out`, e quem cria
  conta sai da régua na hora (casamento por contato normalizado no cadastro).

**5.5 — Posição do formulário.** Estava na última seção antes do rodapé, **depois
do CTA final** — quem abandonava no meio nunca o via, e o pedido era justamente
capturar quem não compra na hora. Subiu para antes do fechamento, nas duas
landings, e ganhou a pergunta certa ("Ainda em dúvida? A gente te mostra").

**5.6 — Landing reescrita nos 5 Gs.** A página abria com um carrossel de
recursos — violação literal do "não abrir com uma lista longa de recursos" da
apresentação. O carrossel saiu, e com ele a grade de seis recursos.

O que abre agora é a **dor**: "Você atende o dia inteiro e, no fim do mês, ainda
não sabe quanto sobrou", com o nicho no primeiro selo — **barbearia de 2 a 8
profissionais** — e um bloco de quatro dores na linguagem do balcão. Depois vem o
**fluxo conectado**: os 5 Gs encadeados, cada um puxando o próximo (o horário
vira histórico, o histórico vira dinheiro, o dinheiro fecha a comissão), que é a
ligação que o produto tem e a página não contava.

O `<title>` deixou de dizer "o sistema completo" — o que a apresentação
desaconselha por não criar posição — e passou a dizer o nicho.

**Telas do sistema:** a promessa central é simplicidade e a página não mostrava
uma única tela. Agora mostra três (agenda em grade, clientes que sumiram,
financeiro com lucro), **desenhadas em HTML** com os mesmos elementos e a mesma
hierarquia das telas reais, e não capturas em PNG. O porquê: captura vira mentira
no dia em que a tela muda e ninguém troca o arquivo; PNG de painel não responde
no celular, que é onde metade do tráfego lê; e imagem não tem texto para leitor
de tela. Todo número aparece rotulado como demonstração — a Fase 0 tirou
depoimento fictício desta mesma página, e o princípio vale para cifra em tela.

**5.7 — O diferencial invisível.** Bloco dedicado, com a pergunta que o sócio
pediu — **"Quantos clientes sumiram sem você perceber?"** — a explicação de que
cliente insatisfeito reclama e cliente que cansou só some, e a tela de clientes
ao lado, com os selos de atrasado/perto de voltar/em dia e a lista de quem
chamar hoje.

**5.8 — Iscas de lead.** Duas, ambas entregando valor antes de pedir contato:

- **Calculadora**: quanto vale recuperar 5% da base que sumiu, com base e gasto
  médio ajustáveis. A premissa é única, conservadora e declarada na tela — não é
  projeção de clientes novos, é cliente que já foi seu voltando uma vez.
- **Diagnóstico dos 5 Gs**: cinco perguntas de sim ou não, uma por G. O resultado
  nomeia o G mais fraco e diz por que ele custa caro — e só **depois** oferece a
  captura.

**5.9 — Formulário do salão.** Já estava corrigido: a Fase 0 mexeu neste
componente pelo §0.5 e aproveitou para criar a variante clara (campos brancos com
texto `#33202b`, card com borda e sombra sobre o fundo claro). Confirmado em
código; o que faltava era a **posição**, que o §5.5 acima resolveu. O bloco de
planos do salão, que era mensal-só, passou a usar o mesmo alternador com a
paleta clara — se tivesse reusado o componente escuro, teria recriado
exatamente o defeito que o §5.9 aponta.

## O que NÃO está entregue

- **Credenciais.** Nem o gateway nem o e-mail têm chave configurada. As duas
  integrações estão prontas e desligadas por ausência de variável de ambiente,
  documentadas em `.env.example`. Ligar o pagamento é preencher
  `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET` na Vercel e apontar
  o webhook para `/api/webhooks/mercadopago`; a régua é `RESEND_API_KEY` e
  `EMAIL_FROM`.
- **Teste do fluxo real de pagamento.** Sem credencial não houve compra de ponta
  a ponta. O que foi testado: assinatura do webhook (incluindo troca de id e
  replay), mapeamento de estados, decisão da régua e o cupom contra o banco de
  produção. O primeiro pagamento real precisa ser acompanhado.
- **WhatsApp na régua.** A régua envia só e-mail. O consentimento coletado é de
  contato, e disparo ativo em massa no WhatsApp exige template aprovado — sem
  isso o número da plataforma cai. Está explicitado no código.

## Verificação

- `typecheck`, `lint`, **135 testes** e `build` verdes (18 testes novos: 9 do
  Mercado Pago, 9 da régua de lead).
- Migração aplicada no projeto Supabase `barbearia-saas` e conferida no banco
  vivo: catálogo devolvendo a versão 2 (R$ 59,90 / R$ 499 / R$ 119,90 / R$ 999),
  `validate_coupon('volta20','starter','yearly')` devolvendo R$ 99,80 de desconto
  e `NOT_APPLICABLE` no mensal.
